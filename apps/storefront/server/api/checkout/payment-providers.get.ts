import { medusa } from "../../utils/medusa"
import { requireCartId } from "../../utils/session"
import { cartRegionResponse, paymentProvidersResponse } from "../../utils/store-mappers"

export default defineEventHandler(async (event) => {
  const region_id = await medusa(event, "/store/carts/:id", cartRegionResponse, {
    params: { id: requireCartId(event) },
    query: { fields: "region_id" },
  })
  return medusa(event, "/store/payment-providers", paymentProvidersResponse, {
    query: { region_id },
  })
})
