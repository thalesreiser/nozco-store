import { useDataSource } from "~/data"
import type { ProductsApi } from "~/data/source"

export function useProducts(): ProductsApi {
  return useDataSource().products
}
