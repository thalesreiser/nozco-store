import { useDataSource } from "~/data"
import type { CartApi } from "~/data/source"

export function useCart(): CartApi {
  return useDataSource().cart
}
