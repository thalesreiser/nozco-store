import { z } from "zod"

/**
 * Titles of the two product options of a garment, which are also the keys of
 * `StoreProductListQuery.option_values`. Only the titles are fixed: the values of each option (the size
 * grid and the colours) are data, chosen per product.
 */
export const APPAREL_OPTION_TITLES = { size: "Tamanho", color: "Cor" } as const

const text = z.string().trim().min(1)
const positive = z.number().positive()

/**
 * What `StoreProduct.metadata` holds for a garment. Every field is optional because the real fabric specs
 * are pending (Q-03). The keys are flat and the values primitive because the Medusa Admin metadata editor
 * cannot edit nested values; it turns a purely numeric input into a number. Other keys are allowed in the
 * metadata and dropped when parsing.
 */
export const apparelMetadataSchema = z.object({
  fabric: text.optional(),
  care: text.optional(),
  /** Grams. */
  weight_g: positive.int().optional(),
  /** Centimetres, like the two below. */
  length_cm: positive.optional(),
  width_cm: positive.optional(),
  height_cm: positive.optional(),
})

export type ApparelMetadata = z.infer<typeof apparelMetadataSchema>
