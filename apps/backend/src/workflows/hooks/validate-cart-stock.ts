import type {
  ConfirmVariantInventoryWorkflowInputDTO,
  MedusaContainer,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  addToCartWorkflow,
  confirmVariantInventoryWorkflow,
  createCartWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  type CartLineQuantity,
  totalsOfSplitVariants,
  withLineQuantity,
} from "../../lib/cart-stock"
import { queryList } from "../../lib/store-setup/query"

type InventoryVariant = ConfirmVariantInventoryWorkflowInputDTO["variants"][number]

// Medusa types the `cart` of these hooks as any. These are the fields it holds that are read here.
type HookCart<Line = CartLineQuantity> = {
  sales_channel_id?: string | null
  items?: Line[]
}

// What Medusa's inventory check reads. Medusa does not export its own list from the core flows.
const VARIANT_FIELDS = [
  "id",
  "manage_inventory",
  "allow_backorder",
  "inventory_items.inventory_item_id",
  "inventory_items.required_quantity",
  "inventory_items.inventory.location_levels.stocked_quantity",
  "inventory_items.inventory.location_levels.reserved_quantity",
  "inventory_items.inventory.location_levels.raw_stocked_quantity",
  "inventory_items.inventory.location_levels.raw_reserved_quantity",
  "inventory_items.inventory.location_levels.location_id",
  "inventory_items.inventory.location_levels.stock_locations.id",
  "inventory_items.inventory.location_levels.stock_locations.name",
  "inventory_items.inventory.location_levels.stock_locations.sales_channels.id",
  "inventory_items.inventory.location_levels.stock_locations.sales_channels.name",
]

/**
 * Runs Medusa's own inventory check on the total of a variant split across lines, which is the one case
 * its per-line check misses. It rejects with the same error, so the route answers the same way.
 */
async function confirmSplitVariants(
  container: MedusaContainer,
  salesChannelId: string | null | undefined,
  lines: CartLineQuantity[],
): Promise<void> {
  const items = totalsOfSplitVariants(lines)
  if (items.length === 0 || !salesChannelId) return

  const variants = await queryList<InventoryVariant>(container, {
    entity: "product_variant",
    fields: VARIANT_FIELDS,
    filters: { id: items.map((item) => item.variant_id) },
  })
  await confirmVariantInventoryWorkflow(container).run({
    input: {
      sales_channel_id: salesChannelId,
      variants,
      items,
    },
  })
}

// A workflow takes one consumer per hook, so new cart rules belong in these three consumers.
createCartWorkflow.hooks.validate(async (data, { container }) => {
  const cart = data.cart as HookCart
  await confirmSplitVariants(container, cart.sales_channel_id, cart.items ?? [])
})

addToCartWorkflow.hooks.validate(async ({ input, ...data }, { container }) => {
  const cart = data.cart as HookCart
  const existing = await container
    .resolve(Modules.CART)
    .listLineItems({ cart_id: input.cart_id }, { select: ["variant_id", "quantity"] })
  await confirmSplitVariants(container, cart.sales_channel_id, [...existing, ...input.items])
})

updateLineItemInCartWorkflow.hooks.validate(async ({ input, ...data }, { container }) => {
  const cart = data.cart as HookCart<CartLineQuantity & { id: string }>
  const { quantity } = input.update
  // Zero removes the line, which never needs stock.
  if (quantity === undefined || Number(quantity) === 0) return
  const lines = withLineQuantity(cart.items ?? [], input.item_id, quantity)
  await confirmSplitVariants(container, cart.sales_channel_id, lines)
})
