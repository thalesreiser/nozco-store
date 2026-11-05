import { orderParamsSchema } from "#shared/schemas/bff"
import { apiError, parseInput } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { requireSession } from "../../utils/session"
import { ordersResponse } from "../../utils/store-mappers"

// Medusa's GET /store/orders/:id is public by design: anyone with the id reads the order. The list route
// is filtered on the server by the token's customer, so an order of someone else is simply not found.
// The guest link with a token (FE-06.4) will be a separate route.
export default defineEventHandler(async (event) => {
  requireSession(event)
  const { id } = parseInput(orderParamsSchema, getRouterParams(event))
  const { orders } = await medusa(event, "/store/orders", ordersResponse, {
    query: { id, limit: "1" },
  })
  const order = orders[0]
  if (!order) throw apiError(404)
  return order
})
