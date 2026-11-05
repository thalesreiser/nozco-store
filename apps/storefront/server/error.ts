import { toApiErrorResponse } from "./utils/api-error"

// Runs first for every server error, including those of nuxt-security's middleware and unmatched
// routes. Other paths fall through to Nuxt's handler, which renders the error page.
export default defineNitroErrorHandler((error, event) => {
  if (!event.path.startsWith("/api/")) return

  const { status, body } = toApiErrorResponse(error)
  if (status === 500) {
    // The name only: messages of unexpected errors can quote customer input.
    const name = error.cause instanceof Error ? error.cause.name : error.name
    console.error(`[bff] ${event.method} ${event.path.split("?")[0] ?? ""}: ${name}`)
  }
  setResponseStatus(event, status)
  setResponseHeader(event, "cache-control", "no-store")
  return send(event, JSON.stringify(body), "application/json")
})
