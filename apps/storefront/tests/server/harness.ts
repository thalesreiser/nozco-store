import * as h3 from "h3"
import type { EventHandler, H3Event } from "h3"
import { vi } from "vitest"

// Runs the real route, middleware and error handler files on h3, as Nitro does, with Medusa replaced by a
// stubbed fetch. Nitro's auto-imports do not exist outside its build, so they are provided as globals.
// Files are loaded through a glob and not imported by name: their auto-imports only type-check in Nuxt's
// server project, while this folder belongs to the app project.
Object.assign(globalThis, h3, {
  defineNitroErrorHandler: (handler: unknown) => handler,
  useRuntimeConfig: () => ({
    public: {
      apiUrl: "https://medusa.test",
      publishableKey: "pk_test_fictional",
      appEnv: "production",
      dataSource: "api",
    },
  }),
})

type Loader = () => Promise<{ default: EventHandler }>

const routeFiles = import.meta.glob<{ default: EventHandler }>("../../server/api/**/*.ts")
const middlewareFiles = import.meta.glob<{ default: EventHandler }>("../../server/middleware/*.ts")
const errorFile = import.meta.glob<{ default: (error: h3.H3Error, event: H3Event) => unknown }>(
  "../../server/error.ts",
)

export const SESSION_COOKIE = "__Host-nozco_session"
export const CART_COOKIE = "__Host-nozco_cart"
export const STORE_HOST = "store.test"
export const FAKE_TOKEN = "fictional.jwt.token"

/** `api/orders/[id].get.ts` to `{ method: "get", path: "/api/orders/:id" }`, as Nitro's file routing. */
function routeOf(file: string): { method: "get" | "post"; path: string } {
  const match = /server(\/api\/.+)\.(get|post)\.ts$/.exec(file)
  if (!match?.[1] || !match[2]) throw new Error(`Unexpected route file: ${file}`)
  const path = match[1].replace(/\/index$/, "").replace(/\[(\w+)\]/g, ":$1")
  return { method: match[2] as "get" | "post", path }
}

async function createFetchHandler() {
  const onErrorLoader = Object.values(errorFile)[0]
  if (!onErrorLoader) throw new Error("server/error.ts not found")
  const { default: onError } = await onErrorLoader()
  const app = h3.createApp({ onError: (error, event) => onError(error, event) as Promise<void> })
  for (const load of Object.values<Loader>(middlewareFiles)) {
    app.use((await load()).default)
  }
  const router = h3.createRouter()
  for (const [file, load] of Object.entries<Loader>(routeFiles)) {
    const { method, path } = routeOf(file)
    router[method](path, (await load()).default)
  }
  app.use(router)
  return h3.toWebHandler(app)
}

let handler: ReturnType<typeof h3.toWebHandler> | undefined

interface CallOptions {
  method?: string
  body?: unknown
  rawBody?: string
  cookies?: Record<string, string>
  /** Replaces the headers a same-origin browser sends on a mutation. */
  headers?: Record<string, string>
}

export interface CallResult {
  status: number
  text: string
  json: unknown
  headers: Headers
  setCookies: string[]
}

export async function call(path: string, options: CallOptions = {}): Promise<CallResult> {
  handler ??= await createFetchHandler()
  const method = options.method ?? (options.body === undefined ? "GET" : "POST")
  const cookie = Object.entries(options.cookies ?? {})
    .map(([name, value]) => `${name}=${value}`)
    .join("; ")
  const sameOrigin: Record<string, string> =
    method === "GET" ? {} : { origin: `https://${STORE_HOST}`, "sec-fetch-site": "same-origin" }
  const response = await handler(
    new Request(`https://${STORE_HOST}${path}`, {
      method,
      headers: {
        host: STORE_HOST,
        ...(cookie ? { cookie } : {}),
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        ...(options.headers ?? sameOrigin),
      },
      body:
        options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
    }),
  )
  const text = await response.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    json = undefined
  }
  return {
    status: response.status,
    text,
    json,
    headers: response.headers,
    setCookies: response.headers.getSetCookie(),
  }
}

export interface UpstreamCall {
  method: string
  pathname: string
  search: URLSearchParams
  headers: Headers
  body: unknown
}

type UpstreamAnswer = Response | (() => Response | Promise<Response>)

/** Answers by `"METHOD /path"`; anything else fails as unreachable. Returns the calls Medusa received. */
export function stubMedusa(answers: Record<string, UpstreamAnswer> = {}): UpstreamCall[] {
  const calls: UpstreamCall[] = []
  vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => {
    const method = init.method ?? "GET"
    calls.push({
      method,
      pathname: url.pathname,
      search: url.searchParams,
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    })
    const answer = answers[`${method} ${url.pathname}`]
    if (!answer) throw new TypeError("fetch failed")
    return typeof answer === "function" ? answer() : answer.clone()
  })
  return calls
}

export function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  })
}
