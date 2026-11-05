import { apiError } from "../utils/api-error"

// CSRF defence for every mutation, on every path, so a new route is covered without opting in.
//
// nuxt-security only wraps nuxt-csurf (`security.csrf`), which keeps a per-visitor secret in a cookie and
// a token in the rendered page. Pages here are cached with SWR, so that token and cookie would be shared
// or stale. Instead this reads what the browser itself states and page scripts cannot forge:
// Sec-Fetch-Site, and Origin for browsers without it. SameSite=Lax on the cookies is the second layer.
//
// With both headers missing the caller is not a browser that sends them. Only the store's own front end
// calls these routes, so that is refused too.
export default defineEventHandler((event) => {
  if (["GET", "HEAD", "OPTIONS"].includes(event.method)) return

  const fetchSite = getRequestHeader(event, "sec-fetch-site")
  const origin = getRequestHeader(event, "origin")
  if (!fetchSite && !origin) throw rejected()
  if (fetchSite && fetchSite !== "same-origin") throw rejected()
  if (origin && !hasHost(origin, getRequestHost(event))) throw rejected()
})

function rejected() {
  return apiError(403, { code: "csrf_rejected", message: "This request came from another site." })
}

function hasHost(origin: string, host: string): boolean {
  return URL.canParse(origin) && new URL(origin).host === host
}
