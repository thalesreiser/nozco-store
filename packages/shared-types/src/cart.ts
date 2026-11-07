import { z } from "zod"

const WHOLE_QUANTITY = "must be a whole number"

/** Only a fractional number fails here. Medusa's own validators keep every other rule of these fields. */
function isNotFractional(value: unknown): boolean {
  return typeof value !== "number" || Number.isInteger(value)
}

/**
 * The quantities of a cart request: `quantity` on a line, `items[].quantity` when a cart is created.
 * Unknown fields stay, because Medusa's routes validate the rest of the body.
 */
export const cartQuantitiesSchema = z.looseObject({
  quantity: z.unknown().refine(isNotFractional, WHOLE_QUANTITY).optional(),
  items: z
    .unknown()
    .refine(
      (items) =>
        !Array.isArray(items) ||
        items.every((item: { quantity?: unknown } | null) => isNotFractional(item?.quantity)),
      WHOLE_QUANTITY,
    )
    .optional(),
})
