import { afterEach, describe, expect, it, vi } from "vitest"
import { call, FAKE_TOKEN, jsonResponse, SESSION_COOKIE, stubMedusa } from "./harness"

const CREDENTIALS = { email: "cliente@example.com", password: "senha ficticia <1>" }

afterEach(() => vi.unstubAllGlobals())

describe("POST /api/auth/login", () => {
  const medusaLogin = { "POST /auth/customer/emailpass": jsonResponse({ token: FAKE_TOKEN }) }

  it("keeps the token in an HttpOnly, Secure, SameSite=Lax cookie that only the host can set", async () => {
    stubMedusa(medusaLogin)
    const { status, setCookies } = await call("/api/auth/login", { body: CREDENTIALS })

    expect(status).toBe(200)
    expect(setCookies).toHaveLength(1)
    const [pair, ...attributes] = (setCookies[0] ?? "").split("; ")
    expect(pair).toBe(`${SESSION_COOKIE}=${FAKE_TOKEN}`)
    expect(attributes).toEqual(
      expect.arrayContaining(["HttpOnly", "Secure", "SameSite=Lax", "Path=/", "Max-Age=86400"]),
    )
    expect(attributes.some((attribute) => attribute.startsWith("Domain"))).toBe(false)
  })

  it("never returns the token in the body", async () => {
    stubMedusa(medusaLogin)
    const { text, json } = await call("/api/auth/login", { body: CREDENTIALS })

    expect(json).toEqual({ authenticated: true })
    expect(text).not.toContain(FAKE_TOKEN)
  })

  it("sends the credentials server to server and nothing from the browser's request", async () => {
    const calls = stubMedusa(medusaLogin)
    await call("/api/auth/login", {
      body: CREDENTIALS,
      cookies: { [SESSION_COOKIE]: "older.token" },
      headers: {
        origin: "https://store.test",
        "sec-fetch-site": "same-origin",
        "x-forwarded-for": "203.0.113.7",
        "cf-connecting-ip": "203.0.113.7",
        "user-agent": "fictional-browser",
      },
    })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.pathname).toBe("/auth/customer/emailpass")
    expect(calls[0]?.body).toEqual(CREDENTIALS)
    expect([...(calls[0]?.headers.keys() ?? [])].sort()).toEqual([
      "accept",
      "content-type",
      "x-publishable-api-key",
    ])
  })

  it("answers invalid credentials without setting a cookie or repeating upstream", async () => {
    stubMedusa({
      "POST /auth/customer/emailpass": jsonResponse({ message: "row in table auth_identity" }, 401),
    })
    const { status, json, setCookies } = await call("/api/auth/login", { body: CREDENTIALS })

    expect(status).toBe(401)
    expect(json).toEqual({ code: "invalid_credentials", message: expect.any(String) as string })
    expect(setCookies).toEqual([])
  })

  it.each([
    ["a missing password", { email: "cliente@example.com" }],
    ["an invalid e-mail", { email: "not-an-email", password: "x" }],
    ["an unknown field", { ...CREDENTIALS, is_admin: true }],
    ["a non-object", "text"],
  ])("refuses %s before calling upstream", async (_, body) => {
    const calls = stubMedusa()
    const { status, json } = await call("/api/auth/login", { body })

    expect(status).toBe(400)
    expect(json).toEqual({ code: "invalid_request", message: expect.any(String) as string })
    expect(calls).toEqual([])
  })

  it("does not echo the input of a refused request", async () => {
    stubMedusa()
    const { text } = await call("/api/auth/login", {
      body: { email: "not-an-email", password: "segredo-ficticio" },
    })
    expect(text).not.toContain("segredo-ficticio")
    expect(text).not.toContain("not-an-email")
  })
})

describe("GET /api/auth/session", () => {
  const customer = {
    id: "cus_1",
    email: "cliente@example.com",
    first_name: "Cliente",
    last_name: "Ficticio",
    metadata: { internal: "drop me" },
  }

  it("answers without calling upstream when there is no cookie", async () => {
    const calls = stubMedusa()
    expect((await call("/api/auth/session")).json).toEqual({ authenticated: false })
    expect(calls).toEqual([])
  })

  it("uses the cookie as a bearer token and returns only the allowed customer fields", async () => {
    const calls = stubMedusa({ "GET /store/customers/me": jsonResponse({ customer }) })
    const { json, text } = await call("/api/auth/session", {
      cookies: { [SESSION_COOKIE]: FAKE_TOKEN },
    })

    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${FAKE_TOKEN}`)
    expect(calls[0]?.headers.has("cookie")).toBe(false)
    expect(json).toEqual({
      authenticated: true,
      customer: {
        id: "cus_1",
        email: "cliente@example.com",
        first_name: "Cliente",
        last_name: "Ficticio",
      },
    })
    expect(text).not.toContain(FAKE_TOKEN)
  })

  it("clears a token that upstream refuses", async () => {
    stubMedusa({ "GET /store/customers/me": jsonResponse({}, 401) })
    const { json, setCookies } = await call("/api/auth/session", {
      cookies: { [SESSION_COOKIE]: "expired.token" },
    })

    expect(json).toEqual({ authenticated: false })
    expect(setCookies[0]).toContain(`${SESSION_COOKIE}=;`)
    expect(setCookies[0]).toContain("Max-Age=0")
  })
})

describe("POST /api/auth/logout", () => {
  it("clears both cookies, with the attributes a __Host- cookie needs to be replaced", async () => {
    const calls = stubMedusa()
    const { status, setCookies } = await call("/api/auth/logout", {
      method: "POST",
      cookies: { [SESSION_COOKIE]: FAKE_TOKEN },
    })

    expect(status).toBe(200)
    expect(calls).toEqual([])
    expect(setCookies).toHaveLength(2)
    for (const cookie of setCookies) {
      expect(cookie).toContain("Max-Age=0")
      expect(cookie).toContain("Secure")
      expect(cookie).toContain("Path=/")
    }
  })
})
