import { medusa } from "../../utils/medusa"
import { requireCartId } from "../../utils/session"
import { shippingOptionsResponse } from "../../utils/store-mappers"

export default defineEventHandler((event) =>
  medusa(event, "/store/shipping-options", shippingOptionsResponse, {
    query: { cart_id: requireCartId(event) },
  }),
)
