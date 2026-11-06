import { parsePublicRuntimeConfig } from "#shared/schemas/runtime-config"
import type { H3Event } from "h3"
import type { z } from "zod"
import { apiError } from "./api-error"
import { clearSessionToken, readSessionToken } from "./session"

const TIMEOUT_MS = 10_000

interface MedusaOptions {
  method?: "GET" | "POST"
  /** Values for the `:name` segments of the route. */
  params?: Record<string, string>
  query?: Record<string, string>
  body?: unknown
  /** False for the login call itself, which must not carry an older token. */
  useSession?: boolean
}

/**
 * PENDING, Thales decides. Medusa sees the Worker's address, so the per-address login limit of BE-10.2
 * is shared by every customer behind one Worker address. The recommendation is a header protected by a
 * secret, which Medusa trusts only when the secret matches. Until then nothing is forwarded, and in
 * particular not the browser's own X-Forwarded-For, which a client can forge.
 */
function clientAddressHeaders(_event: H3Event): Record<string, string> {
  return {}
}

/** Delta-seconds, the form BE-10.2 sends. Anything else from upstream is not repeated to the browser. */
function retryAfterSeconds(value: string | null): number | undefined {
  return value && /^\d{1,7}$/.test(value) ? Number(value) : undefined
}

// The route template, without ids or query values, is all that reaches the logs.
function upstreamFailure(route: string, detail: string, status = 502) {
  console.error(`[bff] ${route}: ${detail}`)
  return apiError(status)
}

const MIRRORED_STATUS = new Set([400, 401, 403, 404, 409, 429])

/**
 * One call to Medusa, server to server. Only fixed headers are sent: nothing from the browser's request
 * is forwarded except the customer token, when there is one. The answer is parsed with `schema`, which
 * drops unknown fields, and failures carry nothing of what Medusa said.
 */
export async function medusa<S extends z.ZodType>(
  event: H3Event,
  route: string,
  schema: S,
  options: MedusaOptions = {},
): Promise<z.output<S>> {
  const { apiUrl, publishableKey } = parsePublicRuntimeConfig(useRuntimeConfig(event).public)
  const path = route.replace(/:(\w+)/g, (_, name: string) =>
    encodeURIComponent(options.params?.[name] ?? ""),
  )
  const url = new URL(path, apiUrl)
  url.search = new URLSearchParams(options.query).toString()

  const token = options.useSession === false ? undefined : readSessionToken(event)
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-publishable-api-key": publishableKey,
    ...clientAddressHeaders(event),
  }
  if (token) headers.authorization = `Bearer ${token}`
  if (options.body !== undefined) headers["content-type"] = "application/json"

  let response: Response
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Workers refuse redirect: "error". A redirect from this API is a failure either way.
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError"
    throw upstreamFailure(route, timedOut ? "timed out" : "unreachable", timedOut ? 504 : 502)
  }

  if (!response.ok) {
    if (response.status === 401 && token) clearSessionToken(event)
    if (response.status === 429) {
      const retryAfter = retryAfterSeconds(response.headers.get("retry-after"))
      if (retryAfter !== undefined) setResponseHeader(event, "retry-after", retryAfter)
    }
    if (response.status === 422) throw apiError(400)
    if (MIRRORED_STATUS.has(response.status)) throw apiError(response.status)
    throw upstreamFailure(route, `answered ${String(response.status)}`)
  }

  const parsed = schema.safeParse(await response.json().catch(() => undefined))
  if (!parsed.success) {
    // Paths only: issue messages can quote upstream values.
    const paths = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")
    throw upstreamFailure(route, `unexpected answer (${paths})`)
  }
  return parsed.data
}
