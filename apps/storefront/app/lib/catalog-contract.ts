import type {
  APPAREL_OPTION_TITLES,
  STORE_PRODUCT_DEFAULT_LIMIT,
  StoreProductOrder,
} from "@nozco/shared-types"

// The values of the catalog contract that the browser needs. Importing them from shared-types would put
// its Zod schemas in the entry chunk and break the JS budget, so they are repeated here. The types come
// from the contract: if it changes, this file stops compiling.

export const OPTION_TITLES: typeof APPAREL_OPTION_TITLES = { size: "Tamanho", color: "Cor" }

export const DEFAULT_LIMIT: typeof STORE_PRODUCT_DEFAULT_LIMIT = 20

const orderSet: Record<StoreProductOrder, true> = {
  newest: true,
  best_selling: true,
  price_asc: true,
  price_desc: true,
  on_sale: true,
}

/** `newest` comes first because it is what the API uses when no order is asked for. */
export const PRODUCT_ORDERS = Object.keys(orderSet) as StoreProductOrder[]
