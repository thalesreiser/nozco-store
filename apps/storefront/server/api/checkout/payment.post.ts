import { startPaymentSchema } from "#shared/schemas/bff"
import { parseInput } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { requireCartId } from "../../utils/session"
import { paymentCollectionResponse, paymentSessionResponse } from "../../utils/store-mappers"

// Provider-neutral skeleton: Mercado Pago and any provider input wait for DEC-09 and BE-05.x.
export default defineEventHandler(async (event) => {
  const cart_id = requireCartId(event)
  const { provider_id } = parseInput(startPaymentSchema, await readBody(event))
  // Medusa returns the cart's existing collection when there is one, so a retry does not duplicate it.
  const id = await medusa(event, "/store/payment-collections", paymentCollectionResponse, {
    method: "POST",
    body: { cart_id },
  })
  return medusa(
    event,
    "/store/payment-collections/:id/payment-sessions",
    paymentSessionResponse(provider_id),
    { method: "POST", params: { id }, body: { provider_id } },
  )
})
