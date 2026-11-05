import { DataSourceError } from "../errors"
import type { DataSource } from "../source"
import type { MedusaClient } from "./client"

function notImplemented(operation: string, task: string) {
  return (): Promise<never> =>
    Promise.reject(
      new DataSourceError(
        "not_implemented",
        `The api data source does not implement ${operation} yet (${task}).`,
      ),
    )
}

/**
 * Each call rejects until its task connects it, and that task uses the client received here. Medusa
 * returns amounts in major units, so those tasks must convert them to the cents these types promise.
 */
export function createApiSource(_client: MedusaClient): DataSource {
  return {
    products: {
      listProducts: notImplemented("listProducts", "FE-04.1b"),
      getProduct: notImplemented("getProduct", "FE-04.2b"),
    },
    cart: {
      getCart: notImplemented("getCart", "FE-05.1b"),
      addItem: notImplemented("addItem", "FE-05.1b"),
      updateItem: notImplemented("updateItem", "FE-05.1b"),
      removeItem: notImplemented("removeItem", "FE-05.1b"),
    },
    checkout: {
      setContact: notImplemented("setContact", "FE-06.1"),
      listShippingOptions: notImplemented("listShippingOptions", "FE-06.1"),
      selectShippingOption: notImplemented("selectShippingOption", "FE-06.1"),
      listPaymentProviders: notImplemented("listPaymentProviders", "FE-06.2"),
      startPayment: notImplemented("startPayment", "FE-06.2"),
      getPaymentStatus: notImplemented("getPaymentStatus", "FE-06.2"),
    },
  }
}
