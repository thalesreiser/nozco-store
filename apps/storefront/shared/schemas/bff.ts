import type { StoreAddress, StoreCheckoutContact, StoreStartPayment } from "@nozco/shared-types"
import { z } from "zod"

// Input of the server routes. Strict objects refuse unknown fields, so nothing the browser adds reaches
// Medusa. Ids become path segments of upstream URLs, so they are limited to URL-safe characters.
export const medusaIdSchema = z.string().regex(/^[\w-]{1,100}$/)

const text = (max: number) => z.string().trim().min(1).max(max)

export const loginBodySchema = z.strictObject({
  email: z.email().max(254),
  // Never trimmed: spaces can be part of a password.
  password: z.string().min(1).max(256),
})

const addressSchema = z.strictObject({
  first_name: text(100),
  last_name: text(100),
  address_1: text(200),
  address_2: text(200).nullable(),
  city: text(100),
  province: text(50),
  // Masked inputs send unmasked values (docs/05-frontend-standards.md).
  postal_code: z.string().regex(/^\d{8}$/),
  country_code: z.literal("br"),
  phone: z
    .string()
    .regex(/^\d{10,11}$/)
    .nullable(),
}) satisfies z.ZodType<StoreAddress>

export const checkoutContactSchema = z.strictObject({
  email: z.email().max(254),
  shipping_address: addressSchema,
  billing_address: addressSchema.optional(),
}) satisfies z.ZodType<StoreCheckoutContact>

export const selectShippingOptionSchema = z.strictObject({ option_id: medusaIdSchema })

// `data` of StoreStartPayment is refused on purpose until DEC-09 settles what may pass through here.
export const startPaymentSchema = z.strictObject({
  provider_id: medusaIdSchema,
}) satisfies z.ZodType<StoreStartPayment>

export const orderListQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

export const orderParamsSchema = z.strictObject({ id: medusaIdSchema })
