import type { CreateProductWorkflowInputDTO, MedusaContainer } from "@medusajs/framework/types"
import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import {
  type ApparelGrid,
  buildApparelOptions,
  buildApparelVariants,
  planInventoryLevels,
  planStockBySku,
  type StockEntry,
  type VariantInventoryRow,
} from "../lib/apparel/variants"

type WorkflowInput = {
  product: CreateProductWorkflowInputDTO
  stockBySku: Record<string, number>
  stockLocationId: string
}

// A workflow, so a failure at any step leaves no product without stock levels behind.
export const createApparelProductWorkflow = createWorkflow(
  "create-apparel-product",
  (input: WorkflowInput) => {
    const products = createProductsWorkflow.runAsStep({
      input: transform({ input }, ({ input: data }) => ({ products: [data.product] })),
    })
    const productId = transform({ products }, ({ products: created }) => created[0]?.id)

    const { data: variants } = useQueryGraphStep({
      entity: "product_variant",
      fields: ["sku", "inventory_items.inventory_item_id"],
      filters: { product_id: productId },
    })

    const inventory_levels = transform({ variants, input }, (data) =>
      planInventoryLevels(
        data.variants as VariantInventoryRow[],
        data.input.stockBySku,
        data.input.stockLocationId,
      ),
    )
    createInventoryLevelsWorkflow.runAsStep({ input: { inventory_levels } })

    return new WorkflowResponse({ productId })
  },
)

export type ApparelProductInput = ApparelGrid & {
  /** Everything else Medusa takes: title, handle, status, type_id, category_ids, collection_id... */
  product: Omit<CreateProductWorkflowInputDTO, "options" | "variants">
  /** A combination left out starts at zero. */
  stock?: StockEntry[]
  stockLocationId: string
}

/** Creates a garment with one variant and SKU per combination, and its stock at the given location. */
export async function createApparelProduct(
  container: MedusaContainer,
  { product, stock = [], stockLocationId, ...grid }: ApparelProductInput,
) {
  const variants = buildApparelVariants(grid)
  const { result } = await createApparelProductWorkflow(container).run({
    input: {
      product: { ...product, options: buildApparelOptions(grid), variants },
      stockBySku: planStockBySku(grid, variants, stock),
      stockLocationId,
    },
  })
  return result
}
