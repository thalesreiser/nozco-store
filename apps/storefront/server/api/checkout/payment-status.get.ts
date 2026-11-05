import { apiError } from "../../utils/api-error"

// The order exists only after the payment webhook, and the Store API has no call that links a cart to
// its order, so this needs a backend route (BE-05.2). Connected in FE-06.2.
export default defineEventHandler(() => {
  throw apiError(501, { code: "not_implemented", message: "Payment status is not available yet." })
})
