// Types shaped like the Medusa v2 Store API: same field names, reduced to what the store uses. One
// deliberate difference: every amount here is in integer cents (see `Cents`), and the `compare_at_amount`
// of a price replaces Medusa's `calculated_price.original_amount`, set only when it is above the price.
import type { Cents } from "./index.js"

export interface StoreProductImage {
  id: string
  url: string
  rank: number
}

export interface StoreProductOptionValue {
  id: string
  value: string
  option_id: string
}

/** A garment's option, such as size or colour. */
export interface StoreProductOption {
  id: string
  title: string
  values: StoreProductOptionValue[]
}

export interface StoreVariantPrice {
  calculated_amount: Cents
  /** The "from" price of a sale; null when the variant is not on sale. */
  compare_at_amount: Cents | null
  currency_code: "brl"
}

/** One size in one colour: the unit that has a price and stock. */
export interface StoreProductVariant {
  id: string
  product_id: string
  title: string
  sku: string | null
  /** Units available for this variant. */
  inventory_quantity: number
  /** One value per product option. */
  options: StoreProductOptionValue[]
  /** The gallery for this variant's colour. Variants of one colour share the same images. */
  images: StoreProductImage[]
  calculated_price: StoreVariantPrice
}

export interface StoreProductTaxon {
  id: string
  handle: string
  name: string
}

export interface StoreProduct {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string | null
  thumbnail: string | null
  options: StoreProductOption[]
  variants: StoreProductVariant[]
  images: StoreProductImage[]
  categories: StoreProductTaxon[]
  collection: StoreProductTaxon | null
  metadata?: Record<string, unknown> | null
}

export interface StoreProductListQuery {
  q?: string
  category_handle?: string
  collection_handle?: string
  /** Option values to keep, by option title. A product matches when a variant has every one given. */
  option_values?: Record<string, string[]>
  min_price?: Cents
  max_price?: Cents
  order?: "price_asc" | "price_desc"
  limit?: number
  offset?: number
}

export interface StoreProductListResponse {
  products: StoreProduct[]
  count: number
  limit: number
  offset: number
}

export interface StoreCartLineItem {
  id: string
  cart_id: string
  title: string
  thumbnail: string | null
  quantity: number
  product_id: string
  product_handle: string
  variant_id: string
  variant_title: string
  unit_price: Cents
  compare_at_unit_price: Cents | null
  total: Cents
}

export interface StoreAddress {
  first_name: string
  last_name: string
  address_1: string
  address_2: string | null
  city: string
  province: string
  postal_code: string
  country_code: "br"
  phone: string | null
}

export interface StoreCartShippingMethod {
  id: string
  shipping_option_id: string
  name: string
  amount: Cents
}

export interface StoreCart {
  id: string
  currency_code: "brl"
  email: string | null
  items: StoreCartLineItem[]
  shipping_address: StoreAddress | null
  billing_address: StoreAddress | null
  shipping_methods: StoreCartShippingMethod[]
  item_subtotal: Cents
  shipping_total: Cents
  discount_total: Cents
  total: Cents
}

export interface StoreAddToCart {
  variant_id: string
  quantity: number
}

export interface StoreUpdateLineItem {
  quantity: number
}

export interface StoreCheckoutContact {
  email: string
  shipping_address: StoreAddress
  /** Defaults to the shipping address. */
  billing_address?: StoreAddress
}

export interface StoreCartShippingOption {
  id: string
  name: string
  amount: Cents
}

export interface StorePaymentProvider {
  id: string
}

export interface StoreStartPayment {
  provider_id: string
  /** Provider-specific input, such as a card token created in the browser. */
  data?: Record<string, unknown>
}

export interface StorePaymentSession {
  id: string
  provider_id: string
  amount: Cents
  currency_code: "brl"
  status: "pending" | "authorized" | "captured" | "error" | "canceled"
  /** Provider-specific output, such as a Pix QR code. */
  data: Record<string, unknown>
}

/** The order exists only after the payment webhook, so the store polls for this. */
export type StorePaymentStatus =
  { status: "pending" } | { status: "paid"; order_id: string } | { status: "failed" }
