import type {
  Cents,
  StoreAddress,
  StoreCart,
  StoreCartShippingOption,
  StoreOrder,
  StorePaymentProvider,
  StorePaymentSession,
} from "@nozco/shared-types"
import { z } from "zod"

// The only place in the server routes that reads Medusa's data shapes. Two guarantees follow:
// - Allow-list: Zod drops unknown fields, so internal fields never reach the browser.
// - Amounts: Medusa v2 returns major units (20.5 is R$ 20,50) and the composables' types promise integer
//   cents, so every amount is converted here. Where this boundary lives is pending with Thales; if it
//   moves, only this file changes.

export function toCents(major: number): Cents {
  return Math.round(major * 100)
}

const amount = z.number().transform(toCents)
const optionalText = z
  .string()
  .nullish()
  .transform((value) => value ?? "")
const nullableText = z
  .string()
  .nullish()
  .transform((value) => value ?? null)

const address = z.object({
  first_name: optionalText,
  last_name: optionalText,
  address_1: optionalText,
  address_2: nullableText,
  city: optionalText,
  province: optionalText,
  postal_code: optionalText,
  country_code: z.literal("br"),
  phone: nullableText,
}) satisfies z.ZodType<StoreAddress>

const cart = z
  .object({
    id: z.string(),
    currency_code: z.literal("brl"),
    email: nullableText,
    items: z
      .array(
        z.object({
          id: z.string(),
          title: z.string(),
          thumbnail: nullableText,
          quantity: z.number(),
          product_id: optionalText,
          product_handle: optionalText,
          variant_id: optionalText,
          variant_title: optionalText,
          unit_price: amount,
          compare_at_unit_price: amount.nullish().transform((value) => value ?? null),
          total: amount,
        }),
      )
      .nullish()
      .transform((items) => items ?? []),
    shipping_address: address.nullish().transform((value) => value ?? null),
    billing_address: address.nullish().transform((value) => value ?? null),
    shipping_methods: z
      .array(
        z.object({
          id: z.string(),
          shipping_option_id: optionalText,
          name: z.string(),
          amount,
        }),
      )
      .nullish()
      .transform((methods) => methods ?? []),
    item_subtotal: amount,
    shipping_total: amount,
    discount_total: amount,
    total: amount,
  })
  .transform((value): StoreCart => ({
    ...value,
    items: value.items.map((item) => ({ ...item, cart_id: value.id })),
  }))

/** `+` adds fields that Medusa leaves out of the cart by default. */
export const CART_QUERY = { fields: "+items.total,+shipping_methods.name" }

export const cartResponse = z.object({ cart }).transform((value) => value.cart)

export const cartRegionResponse = z
  .object({ cart: z.object({ region_id: z.string() }) })
  .transform((value) => value.cart.region_id)

// A calculated option (Melhor Envio, BE-06.1) has no amount until it is quoted. FE-06.1 extends this
// when the quoting call exists; until then such an option fails loudly instead of showing a wrong price.
export const shippingOptionsResponse = z
  .object({ shipping_options: z.array(z.object({ id: z.string(), name: z.string(), amount })) })
  .transform((value): StoreCartShippingOption[] => value.shipping_options)

export const paymentProvidersResponse = z
  .object({ payment_providers: z.array(z.object({ id: z.string() })) })
  .transform((value): StorePaymentProvider[] => value.payment_providers)

export const paymentCollectionResponse = z
  .object({ payment_collection: z.object({ id: z.string() }) })
  .transform((value) => value.payment_collection.id)

/** The session just created for `providerId`. `data` stays empty until DEC-09 sets what may pass. */
export function paymentSessionResponse(providerId: string) {
  return z
    .object({
      payment_collection: z.object({
        payment_sessions: z.array(
          z.object({
            id: z.string(),
            provider_id: z.string(),
            amount,
            currency_code: z.literal("brl"),
            status: z.enum(["pending", "authorized", "captured", "error", "canceled"]),
          }),
        ),
      }),
    })
    .transform((value, context): StorePaymentSession => {
      const session = value.payment_collection.payment_sessions.findLast(
        (candidate) => candidate.provider_id === providerId,
      )
      if (!session) {
        context.addIssue({ code: "custom", path: ["payment_sessions"] })
        return z.NEVER
      }
      return { ...session, data: {} }
    })
}

const order = z.object({
  id: z.string(),
  display_id: z.number(),
  status: z.string(),
  payment_status: z.string(),
  fulfillment_status: z.string(),
  created_at: z.string(),
  currency_code: z.literal("brl"),
  items: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        thumbnail: nullableText,
        quantity: z.number(),
        variant_title: optionalText,
        unit_price: amount,
        total: amount,
      }),
    )
    .nullish()
    .transform((items) => items ?? []),
  item_subtotal: amount,
  shipping_total: amount,
  discount_total: amount,
  total: amount,
}) satisfies z.ZodType<StoreOrder>

export const ordersResponse = z.object({
  orders: z.array(order),
  count: z.number(),
  limit: z.number(),
  offset: z.number(),
})

export const customerResponse = z
  .object({
    customer: z.object({
      id: z.string(),
      email: z.string(),
      first_name: nullableText,
      last_name: nullableText,
    }),
  })
  .transform((value) => value.customer)
