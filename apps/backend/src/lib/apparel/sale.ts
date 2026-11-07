import { PriceListStatus, PriceListType } from "@medusajs/framework/utils"
import { STORE_SETUP } from "../store-setup/constants"
import { assertMajorUnits, invalid } from "./amounts"

export type SalePrice = {
  variantId: string
  /** The variant's regular price, which the store shows as the "from" price. */
  regularAmount: number
  saleAmount: number
}

export type SaleInput = {
  title: string
  description: string
  prices: SalePrice[]
  /** ISO 8601. Left out, the sale runs until the price list is ended. */
  startsAt?: string
  endsAt?: string
}

/**
 * The input of `createPriceListsWorkflow` for a sale. A variant's own price stays as the regular price
 * and the list holds the lower one, so Medusa returns them as `original_amount` and `calculated_amount`.
 */
export function buildSalePriceList(sale: SaleInput) {
  if (sale.prices.length === 0) {
    throw invalid("A sale needs at least one variant")
  }
  for (const { variantId, regularAmount, saleAmount } of sale.prices) {
    assertMajorUnits(saleAmount, `Sale price of ${variantId}`)
    assertMajorUnits(regularAmount, `Regular price of ${variantId}`)
    if (saleAmount >= regularAmount) {
      throw invalid(`Sale price of ${variantId} must be below its regular price`)
    }
  }
  return {
    title: sale.title,
    description: sale.description,
    type: PriceListType.SALE,
    status: PriceListStatus.ACTIVE,
    starts_at: sale.startsAt ?? null,
    ends_at: sale.endsAt ?? null,
    prices: sale.prices.map(({ variantId, saleAmount }) => ({
      variant_id: variantId,
      currency_code: STORE_SETUP.currencyCode,
      amount: saleAmount,
    })),
  }
}
