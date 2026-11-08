import type { Cents, StoreProduct } from "@nozco/shared-types"
import type { StockStatus } from "./options"

export interface ProductCardData {
  id: string
  name: string
  to: string
  price: Cents
  compareAt: Cents | null
  stock: StockStatus
  imageSrc?: string
}

/** The cheapest variant sets the card's prices. Null for a product with nothing to sell. */
export function toProductCard(product: StoreProduct): ProductCardData | null {
  const [first, ...others] = product.variants
  if (!first) return null
  const cheapest = others.reduce(
    (lowest, variant) =>
      variant.calculated_price.calculated_amount < lowest.calculated_price.calculated_amount
        ? variant
        : lowest,
    first,
  )
  return {
    id: product.id,
    name: product.title,
    to: `/produto/${product.handle}`,
    price: cheapest.calculated_price.calculated_amount,
    compareAt: cheapest.calculated_price.compare_at_amount,
    stock: product.variants.some((variant) => variant.in_stock) ? "in" : "out",
    imageSrc: product.thumbnail ?? undefined,
  }
}
