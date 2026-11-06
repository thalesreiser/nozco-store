import { isApiError } from "../../utils/api-error"
import { medusa } from "../../utils/medusa"
import { readSessionToken } from "../../utils/session"
import { customerResponse } from "../../utils/store-mappers"

/** Tells the interface who is signed in. The token itself never leaves the cookie. */
export default defineEventHandler(async (event) => {
  if (!readSessionToken(event)) return { authenticated: false }
  try {
    const customer = await medusa(event, "/store/customers/me", customerResponse)
    return { authenticated: true, customer }
  } catch (error) {
    // medusa() has already cleared a token that upstream refused.
    if (isApiError(error, "unauthorized")) return { authenticated: false }
    throw error
  }
})
