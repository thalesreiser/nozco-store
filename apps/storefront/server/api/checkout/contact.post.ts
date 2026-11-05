import { checkoutContactSchema } from "#shared/schemas/bff"
import { parseInput } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { requireCartId } from "../../utils/session"
import { CART_QUERY, cartResponse } from "../../utils/store-mappers"

// Guest or signed in (DEC-05 is open): the token goes along only when the customer has one.
export default defineEventHandler(async (event) => {
  const id = requireCartId(event)
  const { email, shipping_address, billing_address } = parseInput(
    checkoutContactSchema,
    await readBody(event),
  )
  return medusa(event, "/store/carts/:id", cartResponse, {
    method: "POST",
    params: { id },
    query: CART_QUERY,
    body: { email, shipping_address, billing_address: billing_address ?? shipping_address },
  })
})
