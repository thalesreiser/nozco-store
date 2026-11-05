import { medusaIdSchema } from "#shared/schemas/bff"
import type { H3Event } from "h3"
import { apiError } from "./api-error"

// `__Host-` makes the browser refuse these cookies unless they are Secure, on path / and without a
// Domain, so a sibling subdomain cannot set or overwrite them. Browsers accept Secure on localhost.
const SESSION_COOKIE = "__Host-nozco_session"
const CART_COOKIE = "__Host-nozco_cart"

const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax", path: "/" } as const

/** Medusa's default JWT lifetime (`http.jwtExpiresIn`). An expired token is cleared on its first 401. */
const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60

export function setSessionToken(event: H3Event, token: string): void {
  setCookie(event, SESSION_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_MAX_AGE_SECONDS })
}

export function readSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE)
}

export function clearSessionToken(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE, COOKIE_OPTIONS)
}

/** For routes that are never available to guests. */
export function requireSession(event: H3Event): void {
  if (!readSessionToken(event)) throw apiError(401)
}

/** The current cart. FE-05.1b creates the cart and sets this cookie with the same options. */
export function requireCartId(event: H3Event): string {
  const cartId = medusaIdSchema.safeParse(getCookie(event, CART_COOKIE))
  if (!cartId.success) {
    throw apiError(404, { code: "cart_not_found", message: "There is no current cart." })
  }
  return cartId.data
}

export function clearCartId(event: H3Event): void {
  deleteCookie(event, CART_COOKIE, COOKIE_OPTIONS)
}
