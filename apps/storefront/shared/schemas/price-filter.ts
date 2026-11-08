import { z } from "zod"

/** Empty or an amount in reais, with a comma or a dot: 49, 49,9 or 49,90. */
const amount = z
  .string()
  .trim()
  .regex(/^(\d{1,7}([.,]\d{1,2})?)?$/, "invalid")

function toCents(text: string) {
  if (!text) return undefined
  const [whole = "0", fraction = ""] = text.split(/[.,]/)
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
}

export const priceFilterSchema = z
  .object({ min: amount, max: amount })
  .transform(({ min, max }) => ({ min: toCents(min), max: toCents(max) }))
  .refine(({ min, max }) => min === undefined || max === undefined || min <= max, {
    message: "order",
    path: ["max"],
  })

export type PriceFilterData = z.infer<typeof priceFilterSchema>
export interface PriceFilterValues {
  min: string
  max: string
}

/** The opposite of the schema, for filling the inputs from the URL. */
export const centsToInput = (cents: number | undefined) =>
  cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ",").replace(",00", "")
