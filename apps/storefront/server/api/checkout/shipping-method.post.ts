import { selectShippingOptionSchema } from "#shared/schemas/bff"
import { parseInput } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { requireCartId } from "../../utils/session"
import { CART_QUERY, cartResponse } from "../../utils/store-mappers"

export default defineEventHandler(async (event) => {
  const id = requireCartId(event)
  const body = parseInput(selectShippingOptionSchema, await readBody(event))
  return medusa(event, "/store/carts/:id/shipping-methods", cartResponse, {
    method: "POST",
    params: { id },
    query: CART_QUERY,
    body,
  })
})
