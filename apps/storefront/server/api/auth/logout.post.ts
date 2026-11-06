import { clearCartId, clearSessionToken } from "../../utils/session"

// Medusa's JWT is stateless: this ends the browser's session, and a copied token works until it expires.
// The cart goes too, because it holds the customer's e-mail and address on what may be a shared device.
export default defineEventHandler((event) => {
  clearSessionToken(event)
  clearCartId(event)
  return { authenticated: false }
})
