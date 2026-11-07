import { z } from "zod"

export const STORE_PRODUCT_ORDERS = [
  "best_selling",
  "newest",
  "price_asc",
  "price_desc",
  "on_sale",
] as const

export type StoreProductOrder = (typeof STORE_PRODUCT_ORDERS)[number]

export const STORE_PRODUCT_DEFAULT_LIMIT = 20
export const STORE_PRODUCT_MAX_LIMIT = 100

const text = z.string().trim().min(1).max(100)
const cents = z.coerce.number().int().min(0)
/** A query string gives a lone value as a string and repeated ones as a list. */
const textList = z.preprocess(
  (value) => (typeof value === "string" ? [value] : value),
  z.array(text).min(1).max(20),
)

const regionField = { region_id: text }

const filterFields = {
  ...regionField,
  q: text.optional(),
  category_handle: text.optional(),
  collection_handle: text.optional(),
  option_values: z.record(text, textList).optional(),
  min_price: cents.optional(),
  max_price: cents.optional(),
}

function priceRangeIsOrdered(query: { min_price?: number; max_price?: number }) {
  return (
    query.min_price === undefined ||
    query.max_price === undefined ||
    query.min_price <= query.max_price
  )
}
const priceRangeError = { message: "min_price must not exceed max_price", path: ["min_price"] }

/** `GET /store/catalog/products/:handle`. */
export const storeProductRequestSchema = z.strictObject(regionField)

/** `GET /store/catalog/facets`: the filters of a listing. Prices are in cents, as in the listing. */
export const storeProductFacetsRequestSchema = z
  .strictObject(filterFields)
  .refine(priceRangeIsOrdered, priceRangeError)

/**
 * `GET /store/catalog/products`: `StoreProductListQuery` as a query string, plus the region that prices
 * it. Unknown parameters are refused, because a misspelt filter would otherwise list the whole catalog.
 */
export const storeProductListRequestSchema = z
  .strictObject({
    ...filterFields,
    order: z.enum(STORE_PRODUCT_ORDERS).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(STORE_PRODUCT_MAX_LIMIT)
      .default(STORE_PRODUCT_DEFAULT_LIMIT),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine(priceRangeIsOrdered, priceRangeError)

export type StoreProductRequest = z.infer<typeof storeProductRequestSchema>
export type StoreProductFacetsRequest = z.infer<typeof storeProductFacetsRequestSchema>
export type StoreProductListRequest = z.infer<typeof storeProductListRequestSchema>
