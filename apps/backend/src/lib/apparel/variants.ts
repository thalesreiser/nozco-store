import { MedusaError } from "@medusajs/framework/utils"
import { APPAREL_OPTION_TITLES } from "@nozco/shared-types"
import { STORE_SETUP } from "../store-setup/constants"
import { assertMajorUnits, invalid } from "./amounts"

/**
 * Pure rules of the apparel model (ADR 004). Sizes and colours always come from the caller: there is no
 * default grid here, because the real one is pending in Q-03.
 */

export type ApparelGrid = {
  /** Identifies the design inside each SKU. It must be unique per product. */
  skuPrefix: string
  sizes: string[]
  colors: string[]
  /** Major units, as Medusa stores them: 20.5 is R$ 20,50. */
  price: number
}

export type ApparelVariant = {
  title: string
  sku: string
  /** Stock is tracked per variant, and a variant with no stock cannot be sold. */
  manage_inventory: true
  allow_backorder: false
  options: Record<string, string>
  prices: { currency_code: string; amount: number }[]
}

export type StockEntry = { size: string; color: string; quantity: number }

function skuSegment(value: string, what: string): string {
  const segment = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  if (!segment) {
    throw invalid(`${what} "${value}" has no letter or digit to build a SKU from`)
  }
  return segment
}

/**
 * Depends only on the three values, so the order of the lists never changes a SKU. Use it for a size or
 * colour added later, too.
 */
export function buildSku(skuPrefix: string, size: string, color: string): string {
  return [
    skuSegment(skuPrefix, "SKU prefix"),
    skuSegment(color, "Colour"),
    skuSegment(size, "Size"),
  ].join("-")
}

function assertDistinct(values: string[], what: string) {
  if (values.length === 0) {
    throw invalid(`At least one ${what} is required`)
  }
  const repeated = values.find((value, index) => values.indexOf(value) !== index)
  if (repeated !== undefined) {
    throw invalid(`${what} "${repeated}" is listed twice`)
  }
}

/** One variant per size and colour combination, each with its own SKU. */
export function buildApparelVariants(grid: ApparelGrid): ApparelVariant[] {
  assertDistinct(grid.sizes, "size")
  assertDistinct(grid.colors, "colour")
  assertMajorUnits(grid.price, "Price")

  const variants = grid.colors.flatMap((color) =>
    grid.sizes.map((size): ApparelVariant => ({
      title: `${size} / ${color}`,
      sku: buildSku(grid.skuPrefix, size, color),
      manage_inventory: true,
      allow_backorder: false,
      options: { [APPAREL_OPTION_TITLES.size]: size, [APPAREL_OPTION_TITLES.color]: color },
      prices: [{ currency_code: STORE_SETUP.currencyCode, amount: grid.price }],
    })),
  )

  // Different values can reach the same SKU: "Azul claro" and "Azul-Claro", or "G" and "g".
  const seen = new Map<string, string>()
  for (const { sku, title } of variants) {
    const other = seen.get(sku)
    if (other) {
      throw invalid(`"${other}" and "${title}" would share the SKU ${sku}`)
    }
    seen.set(sku, title)
  }
  return variants
}

export function buildApparelOptions(grid: Pick<ApparelGrid, "sizes" | "colors">) {
  return [
    { title: APPAREL_OPTION_TITLES.size, values: grid.sizes },
    { title: APPAREL_OPTION_TITLES.color, values: grid.colors },
  ]
}

/** Stock per SKU. A combination left out starts at zero, so it exists at the location and can be restocked. */
export function planStockBySku(
  grid: ApparelGrid,
  variants: ApparelVariant[],
  stock: StockEntry[],
): Record<string, number> {
  const stockBySku = Object.fromEntries(variants.map(({ sku }) => [sku, 0]))
  const seen = new Set<string>()
  for (const { size, color, quantity } of stock) {
    const sku = buildSku(grid.skuPrefix, size, color)
    if (!(sku in stockBySku)) {
      throw invalid(`Stock given for "${size} / ${color}", which is not in the grid`)
    }
    if (seen.has(sku)) {
      throw invalid(`Stock for "${size} / ${color}" is given twice`)
    }
    if (!Number.isInteger(quantity) || quantity < 0) {
      throw invalid(`Stock for "${size} / ${color}" must be a whole number, 0 or more`)
    }
    seen.add(sku)
    stockBySku[sku] = quantity
  }
  return stockBySku
}

export type VariantInventoryRow = {
  sku?: string | null
  inventory_items?: ({ inventory_item_id: string } | null)[] | null
}

/** One level per variant at the stock location, from the inventory items Medusa created for them. */
export function planInventoryLevels(
  variants: VariantInventoryRow[],
  stockBySku: Record<string, number>,
  locationId: string,
) {
  return variants.map((variant) => {
    const inventoryItemId = variant.inventory_items?.[0]?.inventory_item_id
    const quantity = variant.sku ? stockBySku[variant.sku] : undefined
    if (!inventoryItemId || quantity === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Variant ${variant.sku ?? "with no SKU"} has no inventory item or planned stock`,
      )
    }
    return {
      inventory_item_id: inventoryItemId,
      location_id: locationId,
      stocked_quantity: quantity,
    }
  })
}
