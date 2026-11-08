import { z } from "zod"

/**
 * Titles of the two product options of a garment, which are also the keys of
 * `StoreProductListQuery.option_values`. Only the titles are fixed: the values of each option (the size
 * grid and the colours) are data, chosen per product.
 */
export const APPAREL_OPTION_TITLES = { size: "Tamanho", color: "Cor" } as const

/**
 * The order of the launch size grid (ADR 012). It is an order only: a product keeps its own sizes, and
 * nothing refuses a size outside this list.
 */
export const APPAREL_SIZE_ORDER: readonly string[] = ["P", "M", "G", "GG", "XGG"]

/** Sort function for sizes: the grid's order, then any other size in text order. */
export function compareSizes(a: string, b: string) {
  const rank = (size: string) => {
    const index = APPAREL_SIZE_ORDER.indexOf(size)
    return index === -1 ? APPAREL_SIZE_ORDER.length : index
  }
  return rank(a) - rank(b) || a.localeCompare(b, "pt-BR", { numeric: true })
}

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

/**
 * A colour's value lives in the product's metadata under this prefix plus the exact colour name, as in
 * `color_hex:Preto` = `#111111`: flat, because the Medusa Admin metadata editor cannot edit nested values,
 * and per product, because two products can give the same colour name different values. See
 * `docs/adr/013-catalog-stock-and-colour-value.md`.
 */
export const COLOR_HEX_KEY_PREFIX = "color_hex:"

/** `#rrggbb`. Capitals are accepted and come out in lowercase. */
export const colorHexSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/i)
  .toLowerCase()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/** The colour's value in a product's metadata; null when it is absent or not a valid `#rrggbb`. */
export function colorHexFrom(metadata: unknown, color: string): string | null {
  if (!isRecord(metadata)) {
    return null
  }
  const parsed = colorHexSchema.safeParse(metadata[`${COLOR_HEX_KEY_PREFIX}${color}`])
  return parsed.success ? parsed.data : null
}

/** The colour-value keys of a product's metadata whose value is not a valid `#rrggbb`. */
export function invalidColorHexKeys(metadata: unknown): string[] {
  if (!isRecord(metadata)) {
    return []
  }
  return Object.entries(metadata)
    .filter(
      ([key, value]) =>
        key.startsWith(COLOR_HEX_KEY_PREFIX) && !colorHexSchema.safeParse(value).success,
    )
    .map(([key]) => key)
}
