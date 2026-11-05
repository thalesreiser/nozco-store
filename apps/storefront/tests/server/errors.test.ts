import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { call, CART_COOKIE, jsonResponse, stubMedusa } from "./harness"

const LOGIN = "/api/auth/login"
const CREDENTIALS = { email: "cliente@example.com", password: "ficticia" }
const MEDUSA_LOGIN = "POST /auth/customer/emailpass"

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("CSRF", () => {
  const CROSS_SITE: [string, Record<string, string>][] = [
    ["another site", { "sec-fetch-site": "cross-site", origin: "https://evil.example" }],
    ["a sibling subdomain", { "sec-fetch-site": "same-site", origin: "https://a.store.test" }],
    ["a forged fetch-site", { "sec-fetch-site": "same-origin", origin: "https://evil.example" }],
    ["another origin, no fetch metadata", { origin: "https://evil.example" }],
    ["another port", { origin: "https://store.test:8443" }],
    ["an opaque origin", { origin: "null" }],
    ["neither header", {}],
  ]

  it.each(CROSS_SITE)("refuses a mutation from %s before calling upstream", async (_, headers) => {
    const calls = stubMedusa()
    const { status, json } = await call(LOGIN, { body: CREDENTIALS, headers })

    expect(status).toBe(403)
    expect(json).toEqual({ code: "csrf_rejected", message: expect.any(String) as string })
    expect(calls).toEqual([])
  })

  it("covers routes without a body, such as logout", async () => {
    const { status, setCookies } = await call("/api/auth/logout", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    })
    expect(status).toBe(403)
    expect(setCookies).toEqual([])
  })

  it("covers checkout mutations", async () => {
    const { status } = await call("/api/checkout/payment", {
      body: { provider_id: "pp_test" },
      cookies: { [CART_COOKIE]: "cart_1" },
      headers: { origin: "https://evil.example" },
    })
    expect(status).toBe(403)
  })

  it.each([
    ["both headers", { "sec-fetch-site": "same-origin", origin: "https://store.test" }],
    ["only Origin, for older browsers", { origin: "https://store.test" }],
    ["only Sec-Fetch-Site", { "sec-fetch-site": "same-origin" }],
  ])("accepts a same-origin mutation with %s", async (_, headers) => {
    stubMedusa({ [MEDUSA_LOGIN]: jsonResponse({ token: "fictional" }) })
    expect((await call(LOGIN, { body: CREDENTIALS, headers })).status).toBe(200)
  })

  it("lets safe methods through with a cross-site header", async () => {
    stubMedusa()
    const { status } = await call("/api/auth/session", {
      headers: { "sec-fetch-site": "cross-site" },
    })
    expect(status).toBe(200)
  })
})

describe("upstream failures", () => {
  const SECRET_DETAIL = "pg error at 10.0.0.5 table customer"

  it("maps 429 and repeats Retry-After", async () => {
    stubMedusa({
      [MEDUSA_LOGIN]: jsonResponse({ code: "rate_limited", message: SECRET_DETAIL }, 429, {
        "retry-after": "900",
      }),
    })
    const { status, json, headers, text } = await call(LOGIN, { body: CREDENTIALS })

    expect(status).toBe(429)
    expect(json).toEqual({ code: "rate_limited", message: expect.any(String) as string })
    expect(headers.get("retry-after")).toBe("900")
    expect(text).not.toContain(SECRET_DETAIL)
  })

  it.each(["soon", "-5", "<script>", "Wed, 21 Oct 2026 07:28:00 GMT"])(
    "drops an invalid Retry-After: %s",
    async (value) => {
      stubMedusa({ [MEDUSA_LOGIN]: jsonResponse({}, 429, { "retry-after": value }) })
      const { status, headers } = await call(LOGIN, { body: CREDENTIALS })
      expect(status).toBe(429)
      expect(headers.has("retry-after")).toBe(false)
    },
  )

  it.each([
    [400, 400, "invalid_request"],
    [403, 403, "forbidden"],
    [404, 404, "not_found"],
    [409, 409, "conflict"],
    [422, 400, "invalid_request"],
    [500, 502, "upstream_error"],
    [503, 502, "upstream_error"],
    [302, 502, "upstream_error"],
  ])("maps upstream %i to %i %s, without its details", async (upstream, status, code) => {
    stubMedusa({
      [MEDUSA_LOGIN]: new Response(JSON.stringify({ message: SECRET_DETAIL, stack: "at x" }), {
        status: upstream,
      }),
    })
    const result = await call(LOGIN, { body: CREDENTIALS })

    expect(result.status).toBe(status)
    expect(result.json).toEqual({ code, message: expect.any(String) as string })
    expect(result.text).not.toContain(SECRET_DETAIL)
    expect(result.headers.get("content-type")).toContain("application/json")
  })

  it("answers 502 when upstream is unreachable", async () => {
    stubMedusa()
    const { status, json } = await call(LOGIN, { body: CREDENTIALS })
    expect(status).toBe(502)
    expect(json).toEqual({ code: "upstream_error", message: expect.any(String) as string })
  })

  it("answers 504 on a timeout", async () => {
    stubMedusa({
      [MEDUSA_LOGIN]: () => {
        throw new DOMException("timed out", "TimeoutError")
      },
    })
    const { status, json } = await call(LOGIN, { body: CREDENTIALS })
    expect(status).toBe(504)
    expect(json).toEqual({ code: "upstream_timeout", message: expect.any(String) as string })
  })

  it.each([
    ["not JSON", new Response("<html>gateway</html>")],
    ["the wrong shape", jsonResponse({ access: "fictional" })],
  ])("answers 502 when a success body is %s", async (_, answer) => {
    stubMedusa({ [MEDUSA_LOGIN]: answer })
    const { status, setCookies } = await call(LOGIN, { body: CREDENTIALS })
    expect(status).toBe(502)
    expect(setCookies).toEqual([])
  })

  it("logs the route and status, never ids, input or upstream text", async () => {
    stubMedusa({ "GET /store/shipping-options": jsonResponse({ message: SECRET_DETAIL }, 500) })
    await call("/api/checkout/shipping-options", { cookies: { [CART_COOKIE]: "cart_secret" } })

    const logged = vi.mocked(console.error).mock.calls.flat().join(" ")
    expect(logged).toBe("[bff] /store/shipping-options: answered 500")
  })
})

describe("input and responses", () => {
  it("answers malformed JSON with the error contract", async () => {
    stubMedusa()
    const { status, json } = await call(LOGIN, {
      method: "POST",
      rawBody: '{"email":',
      headers: {
        origin: "https://store.test",
        "sec-fetch-site": "same-origin",
        "content-type": "application/json",
      },
    })
    expect(status).toBe(400)
    expect(json).toEqual({ code: "invalid_request", message: expect.any(String) as string })
  })

  it("answers an unknown route under /api with the error contract", async () => {
    const { status, json } = await call("/api/nothing-here")
    expect(status).toBe(404)
    expect(json).toEqual({ code: "not_found", message: expect.any(String) as string })
  })

  it.each(["/api/auth/session", "/api/orders"])("marks %s as not cacheable", async (path) => {
    stubMedusa()
    expect((await call(path)).headers.get("cache-control")).toBe("no-store")
  })
})
