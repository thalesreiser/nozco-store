import { readCpfFromMetadata } from "../cart-cpf"

type Metadata = Record<string, unknown> | null | undefined
type Timestamp = string | Date | null

export interface AddressSource {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  phone?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  metadata?: Metadata
}

export interface CustomerSource {
  id: string
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  phone?: string | null
  metadata?: Metadata
  created_at?: Timestamp
  addresses?: AddressSource[] | null
}

export interface CartSource {
  id: string
  email?: string | null
  metadata?: Metadata
  created_at?: Timestamp
  completed_at?: Timestamp
  shipping_address?: AddressSource | null
  billing_address?: AddressSource | null
}

export interface OrderSource {
  id: string
  display_id?: number | null
  status?: string | null
  email?: string | null
  currency_code?: string | null
  total?: unknown
  metadata?: Metadata
  created_at?: Timestamp
  shipping_address?: AddressSource | null
  billing_address?: AddressSource | null
  items?: { title?: string | null; quantity?: unknown; unit_price?: unknown }[] | null
}

function mapAddress(address: AddressSource | null | undefined) {
  if (!address) {
    return null
  }
  return {
    first_name: address.first_name ?? null,
    last_name: address.last_name ?? null,
    company: address.company ?? null,
    phone: address.phone ?? null,
    address_1: address.address_1 ?? null,
    address_2: address.address_2 ?? null,
    city: address.city ?? null,
    province: address.province ?? null,
    postal_code: address.postal_code ?? null,
    country_code: address.country_code ?? null,
    metadata: address.metadata ?? null,
  }
}

/**
 * `cpf` is the validated value. `metadata` goes out as stored, because a client can write anything
 * there, and whatever it wrote is data held about this person.
 */
function mapCart(cart: CartSource) {
  return {
    id: cart.id,
    email: cart.email ?? null,
    cpf: readCpfFromMetadata(cart.metadata),
    metadata: cart.metadata ?? null,
    created_at: cart.created_at ?? null,
    completed_at: cart.completed_at ?? null,
    shipping_address: mapAddress(cart.shipping_address),
    billing_address: mapAddress(cart.billing_address),
  }
}

function mapOrder(order: OrderSource) {
  return {
    id: order.id,
    display_id: order.display_id ?? null,
    status: order.status ?? null,
    email: order.email ?? null,
    cpf: readCpfFromMetadata(order.metadata),
    metadata: order.metadata ?? null,
    currency_code: order.currency_code ?? null,
    total: order.total ?? null,
    created_at: order.created_at ?? null,
    shipping_address: mapAddress(order.shipping_address),
    billing_address: mapAddress(order.billing_address),
    items: (order.items ?? []).map((item) => ({
      title: item.title ?? null,
      quantity: item.quantity ?? null,
      unit_price: item.unit_price ?? null,
    })),
  }
}

/** Every field is named, so that a column Medusa adds later reaches an export only by decision. */
export function buildCustomerExport(input: {
  customer: CustomerSource
  carts: CartSource[]
  orders: OrderSource[]
  generatedAt: Date
}) {
  const { customer, carts, orders, generatedAt } = input
  return {
    generated_at: generatedAt.toISOString(),
    customer: {
      id: customer.id,
      email: customer.email ?? null,
      first_name: customer.first_name ?? null,
      last_name: customer.last_name ?? null,
      company_name: customer.company_name ?? null,
      phone: customer.phone ?? null,
      cpf: readCpfFromMetadata(customer.metadata),
      metadata: customer.metadata ?? null,
      created_at: customer.created_at ?? null,
    },
    addresses: (customer.addresses ?? []).map(mapAddress),
    carts: carts.map(mapCart),
    orders: orders.map(mapOrder),
  }
}

export type CustomerExport = ReturnType<typeof buildCustomerExport>
