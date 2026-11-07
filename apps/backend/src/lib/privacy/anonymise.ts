import type { UpdateAddressDTO } from "@medusajs/framework/types"
import { type CartStore, type CustomerStore, findCustomer } from "./stores"

/** Every personal field of a customer. The row stays, soft-deleted, so that orders point at something. */
export const ANONYMISED_CUSTOMER = {
  email: null,
  first_name: null,
  last_name: null,
  company_name: null,
  phone: null,
  metadata: null,
} as const

/**
 * Every personal field of a cart address. The order of a completed cart has its own copy. Medusa's DTO
 * types these as strings only, but the columns are nullable and the service passes null through, which
 * `privacy-requests.spec.ts` checks against the database.
 */
export const ANONYMISED_CART_ADDRESS = {
  first_name: null,
  last_name: null,
  company: null,
  phone: null,
  address_1: null,
  address_2: null,
  city: null,
  province: null,
  postal_code: null,
  country_code: null,
  metadata: null,
} as unknown as Omit<UpdateAddressDTO, "id">

/**
 * All of the metadata goes, not only a valid CPF: a client can write anything there, and the order keeps
 * its own copy of what the invoice needs.
 */
export const ANONYMISED_CART = { email: null, metadata: null } as const

/** Without duplicates, because billing and shipping can share a row. */
export function cartAddressIds(
  carts: {
    shipping_address?: { id: string } | null
    billing_address?: { id: string } | null
  }[],
): string[] {
  const ids = carts.flatMap((cart) => [cart.shipping_address?.id, cart.billing_address?.id])
  return [...new Set(ids.filter((id): id is string => !!id))]
}

/**
 * Removes the customer's personal data and login, and touches no order: `docs/lgpd-requests.md` lists
 * what stays and why. Modules share no transaction, so each step is safe to run again, and a failed
 * request resumes when it is approved again. `removeAccount` runs last because it soft-deletes the
 * customer that the steps before it look up.
 */
export async function anonymiseCustomer(
  stores: {
    customers: CustomerStore
    carts: CartStore
    removeAccount: (customerId: string) => Promise<void>
  },
  customerId: string,
): Promise<void> {
  const carts = await stores.carts.listCarts(
    { customer_id: customerId },
    { select: ["id"], relations: ["shipping_address", "billing_address"] },
  )
  const addressIds = cartAddressIds(carts)
  if (addressIds.length) {
    await stores.carts.updateAddresses(addressIds.map((id) => ({ id, ...ANONYMISED_CART_ADDRESS })))
  }
  if (carts.length) {
    await stores.carts.updateCarts(carts.map(({ id }) => ({ id, ...ANONYMISED_CART })))
  }

  const customer = await findCustomer(stores.customers, customerId)
  if (!customer) {
    return
  }
  const customerAddressIds = (customer.addresses ?? []).map(({ id }) => id)
  if (customerAddressIds.length) {
    await stores.customers.deleteCustomerAddresses(customerAddressIds)
  }
  await stores.customers.updateCustomers(customerId, ANONYMISED_CUSTOMER)
  await stores.removeAccount(customerId)
}
