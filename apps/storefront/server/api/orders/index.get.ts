import { orderListQuerySchema } from "#shared/schemas/bff"
import { parseInput } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { requireSession } from "../../utils/session"
import { ordersResponse } from "../../utils/store-mappers"

export default defineEventHandler((event) => {
  requireSession(event)
  const { limit, offset } = parseInput(orderListQuerySchema, getQuery(event))
  return medusa(event, "/store/orders", ordersResponse, {
    query: { limit: String(limit), offset: String(offset), order: "-created_at" },
  })
})
