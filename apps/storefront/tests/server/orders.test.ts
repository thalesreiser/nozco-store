import { afterEach, describe, expect, it, vi } from "vitest"
import { call, FAKE_TOKEN, jsonResponse, SESSION_COOKIE, stubMedusa } from "./harness"

const SIGNED_IN = { [SESSION_COOKIE]: FAKE_TOKEN }

const MEDUSA_ORDER = {
  id: "order_1",
  display_id: 1001,
  status: "pending",
  payment_status: "captured",
  fulfillment_status: "not_fulfilled",
  created_at: "2026-11-05T12:00:00.000Z",
  currency_code: "brl",
  email: "cliente@example.com",
  shipping_address: { address_1: "Rua de Exemplo, 100" },
  items: [
    {
      id: "item_1",
      title: "Camiseta Ficticia",
      thumbnail: null,
      quantity: 1,
      variant_title: "M / Preto",
      unit_price: 79.9,
      total: 79.9,
    },
  ],
  item_subtotal: 79.9,
  shipping_total: 20.5,
  discount_total: 0,
  total: 100.4,
}

const list = (orders: unknown[]) =>
  jsonResponse({ orders, count: orders.length, limit: 20, offset: 0 })

afterEach(() => vi.unstubAllGlobals())

describe.each(["/api/orders", "/api/orders/order_1"])("GET %s", (path) => {
  it("needs a session and never asks upstream without one", async () => {
    const calls = stubMedusa()
    const { status, json } = await call(path)
    expect(status).toBe(401)
    expect(json).toEqual({ code: "unauthorized", message: expect.any(String) as string })
    expect(calls).toEqual([])
  })
})

describe("GET /api/orders", () => {
  it("lists the customer's orders in cents, with the token and newest first", async () => {
    const calls = stubMedusa({ "GET /store/orders": list([MEDUSA_ORDER]) })
    const { json } = await call("/api/orders?limit=5&offset=10", { cookies: SIGNED_IN })

    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${FAKE_TOKEN}`)
    expect(calls[0]?.search.get("limit")).toBe("5")
    expect(calls[0]?.search.get("offset")).toBe("10")
    expect(calls[0]?.search.get("order")).toBe("-created_at")
    expect(json).toMatchObject({
      count: 1,
      orders: [
        {
          id: "order_1",
          total: 10040,
          shipping_total: 2050,
          items: [{ unit_price: 7990, total: 7990 }],
        },
      ],
    })
  })

  it("does not return contact or address data", async () => {
    stubMedusa({ "GET /store/orders": list([MEDUSA_ORDER]) })
    const { text } = await call("/api/orders", { cookies: SIGNED_IN })
    expect(text).not.toContain("cliente@example.com")
    expect(text).not.toContain("Rua de Exemplo")
  })

  it.each(["limit=0", "limit=51", "offset=-1", "limit=x", "fields=*customer"])(
    "refuses the query %s",
    async (query) => {
      const calls = stubMedusa()
      const { status } = await call(`/api/orders?${query}`, { cookies: SIGNED_IN })
      expect(status).toBe(400)
      expect(calls).toEqual([])
    },
  )
})

describe("GET /api/orders/:id", () => {
  it("reads through the list route, which Medusa filters by the token's customer", async () => {
    const calls = stubMedusa({ "GET /store/orders": list([MEDUSA_ORDER]) })
    const { status, json } = await call("/api/orders/order_1", { cookies: SIGNED_IN })

    expect(status).toBe(200)
    expect(calls).toHaveLength(1)
    // Never Medusa's GET /store/orders/:id, which is public to anyone with the id.
    expect(calls[0]?.pathname).toBe("/store/orders")
    expect(calls[0]?.search.get("id")).toBe("order_1")
    expect(json).toMatchObject({ id: "order_1", total: 10040 })
  })

  it("answers 404 for an order of another customer", async () => {
    stubMedusa({ "GET /store/orders": list([]) })
    const { status, json } = await call("/api/orders/order_2", { cookies: SIGNED_IN })
    expect(status).toBe(404)
    expect(json).toEqual({ code: "not_found", message: expect.any(String) as string })
  })

  it("refuses an id with characters outside the id format", async () => {
    const calls = stubMedusa()
    const { status } = await call("/api/orders/order%2F1", { cookies: SIGNED_IN })
    expect(status).toBe(400)
    expect(calls).toEqual([])
  })

  it("clears the session when upstream refuses the token", async () => {
    stubMedusa({ "GET /store/orders": jsonResponse({}, 401) })
    const { status, setCookies } = await call("/api/orders/order_1", { cookies: SIGNED_IN })
    expect(status).toBe(401)
    expect(setCookies[0]).toContain(`${SESSION_COOKIE}=;`)
  })
})
