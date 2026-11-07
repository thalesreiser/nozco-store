import type {
  ICartModuleService,
  ICustomerModuleService,
  IOrderModuleService,
} from "@medusajs/framework/types"
import { buildCustomerExport, type CustomerExport } from "./export"

export type CustomerStore = Pick<
  ICustomerModuleService,
  "listCustomers" | "updateCustomers" | "deleteCustomerAddresses"
>
export type CartStore = Pick<ICartModuleService, "listCarts" | "updateCarts" | "updateAddresses">
export type OrderStore = Pick<IOrderModuleService, "listOrders">

/** Null when the customer does not exist, or was already anonymised. */
export async function findCustomer(customers: Pick<CustomerStore, "listCustomers">, id: string) {
  const [customer] = await customers.listCustomers({ id }, { relations: ["addresses"] })
  return customer ?? null
}

/**
 * Matches by `customer_id` only, never by e-mail. Medusa does not verify the address on registration,
 * so matching by e-mail would hand a stranger's guest orders to whoever registers with that address.
 */
export async function collectCustomerExport(
  stores: { customers: CustomerStore; carts: CartStore; orders: OrderStore },
  customerId: string,
  generatedAt: Date,
): Promise<CustomerExport | null> {
  const customer = await findCustomer(stores.customers, customerId)
  if (!customer) {
    return null
  }
  const carts = await stores.carts.listCarts(
    { customer_id: customerId },
    {
      select: ["id", "email", "metadata", "created_at", "completed_at"],
      relations: ["shipping_address", "billing_address"],
    },
  )
  const orders = await stores.orders.listOrders(
    { customer_id: customerId },
    {
      select: [
        "id",
        "display_id",
        "status",
        "email",
        "currency_code",
        "total",
        "metadata",
        "created_at",
      ],
      relations: ["items", "shipping_address", "billing_address"],
    },
  )
  return buildCustomerExport({ customer, carts, orders, generatedAt })
}
