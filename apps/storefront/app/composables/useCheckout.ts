import { useDataSource } from "~/data"
import type { CheckoutApi } from "~/data/source"

export function useCheckout(): CheckoutApi {
  return useDataSource().checkout
}
