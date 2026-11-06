import { afterEach, describe, expect, it, vi } from "vitest"
import { call, CART_COOKIE, FAKE_TOKEN, jsonResponse, SESSION_COOKIE, stubMedusa } from "./harness"

const CART = { [CART_COOKIE]: "cart_1" }

const ADDRESS = {
  first_name: "Cliente",
  last_name: "Ficticio",
  address_1: "Rua de Exemplo, 100",
  address_2: null,
  city: "Cidade Exemplo",
  province: "SP",
  postal_code: "01000000",
  country_code: "br",
  phone: null,
}

const CONTACT = { email: "cliente@example.com", shipping_address: ADDRESS }

// Medusa's shape: major units, plus internal fields that must not reach the browser.
const MEDUSA_CART = {
  id: "cart_1",
  currency_code: "brl",
  email: "cliente@example.com",
  metadata: { internal: "drop me" },
  customer: { id: "cus_1" },
  sales_channel_id: "sc_1",
  items: [
    {
      id: "item_1",
      title: "Camiseta Ficticia",
      thumbnail: null,
      quantity: 2,
      product_id: "prod_1",
      product_handle: "camiseta-ficticia",
      variant_id: "var_1",
      variant_title: "M / Preto",
      unit_price: 79.9,
      compare_at_unit_price: 99.9,
      total: 159.8,
      metadata: { internal: "drop me" },
    },
  ],
  shipping_address: { ...ADDRESS, id: "addr_1", metadata: {} },
  billing_address: null,
  shipping_methods: [
    { id: "sm_1", shipping_option_id: "so_1", name: "Entrega", amount: 20.5, data: { x: 1 } },
  ],
  item_subtotal: 159.8,
  shipping_total: 20.5,
  discount_total: 0,
  total: 180.3,
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("cart id", () => {
  it.each([
    ["GET", "/api/checkout/shipping-options"],
    ["GET", "/api/checkout/payment-providers"],
  ])("%s %s answers cart_not_found without a cart cookie", async (method, path) => {
    const calls = stubMedusa()
    const { status, json } = await call(path, { method })
    expect(status).toBe(404)
    expect(json).toEqual({ code: "cart_not_found", message: expect.any(String) as string })
    expect(calls).toEqual([])
  })

  it("refuses a cart cookie that could change the upstream path", async () => {
    const calls = stubMedusa()
    const { status } = await call("/api/checkout/contact", {
      body: CONTACT,
      cookies: { [CART_COOKIE]: "..%2F..%2Fadmin%2Fusers" },
    })
    expect(status).toBe(404)
    expect(calls).toEqual([])
  })
})

describe("POST /api/checkout/contact", () => {
  const answers = { "POST /store/carts/cart_1": jsonResponse({ cart: MEDUSA_CART }) }

  it("works for a guest: no login and no bearer token (DEC-05 stays open)", async () => {
    const calls = stubMedusa(answers)
    const { status } = await call("/api/checkout/contact", { body: CONTACT, cookies: CART })

    expect(status).toBe(200)
    expect(calls[0]?.headers.has("authorization")).toBe(false)
  })

  it("sends the token of a signed-in customer", async () => {
    const calls = stubMedusa(answers)
    await call("/api/checkout/contact", {
      body: CONTACT,
      cookies: { ...CART, [SESSION_COOKIE]: FAKE_TOKEN },
    })
    expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${FAKE_TOKEN}`)
  })

  it("defaults billing to shipping and asks Medusa for the fields the type needs", async () => {
    const calls = stubMedusa(answers)
    await call("/api/checkout/contact", { body: CONTACT, cookies: CART })

    expect(calls[0]?.body).toEqual({ ...CONTACT, billing_address: ADDRESS })
    expect(calls[0]?.search.get("fields")).toBe("+items.total,+shipping_methods.name")
  })

  it("converts every amount to integer cents", async () => {
    stubMedusa(answers)
    const { json } = await call("/api/checkout/contact", { body: CONTACT, cookies: CART })

    expect(json).toMatchObject({
      item_subtotal: 15980,
      shipping_total: 2050,
      discount_total: 0,
      total: 18030,
      shipping_methods: [{ amount: 2050 }],
      items: [{ unit_price: 7990, compare_at_unit_price: 9990, total: 15980, cart_id: "cart_1" }],
    })
  })

  it("rounds away binary floating point noise", async () => {
    stubMedusa({
      "POST /store/carts/cart_1": jsonResponse({
        cart: { ...MEDUSA_CART, total: 1.15, shipping_total: 19.99, item_subtotal: 4.35 },
      }),
    })
    const { json } = await call("/api/checkout/contact", { body: CONTACT, cookies: CART })
    expect(json).toMatchObject({ total: 115, shipping_total: 1999, item_subtotal: 435 })
  })

  it("drops fields outside the allow-list", async () => {
    stubMedusa(answers)
    const { text } = await call("/api/checkout/contact", { body: CONTACT, cookies: CART })
    for (const internal of ["metadata", "sales_channel_id", "cus_1", "addr_1"]) {
      expect(text).not.toContain(internal)
    }
  })

  it.each([
    ["a masked CEP", { ...CONTACT, shipping_address: { ...ADDRESS, postal_code: "01000-000" } }],
    ["another country", { ...CONTACT, shipping_address: { ...ADDRESS, country_code: "ar" } }],
    ["a field not in the contract", { ...CONTACT, cpf: "00000000000" }],
  ])("refuses %s", async (_, body) => {
    const calls = stubMedusa()
    const { status } = await call("/api/checkout/contact", { body, cookies: CART })
    expect(status).toBe(400)
    expect(calls).toEqual([])
  })
})

describe("shipping", () => {
  it("lists options for the current cart, in cents", async () => {
    const calls = stubMedusa({
      "GET /store/shipping-options": jsonResponse({
        shipping_options: [{ id: "so_1", name: "Entrega", amount: 20.5, provider_id: "internal" }],
      }),
    })
    const { json } = await call("/api/checkout/shipping-options", { cookies: CART })

    expect(calls[0]?.search.get("cart_id")).toBe("cart_1")
    expect(json).toEqual([{ id: "so_1", name: "Entrega", amount: 2050 }])
  })

  it("selects an option", async () => {
    const calls = stubMedusa({
      "POST /store/carts/cart_1/shipping-methods": jsonResponse({ cart: MEDUSA_CART }),
    })
    const { status } = await call("/api/checkout/shipping-method", {
      body: { option_id: "so_1" },
      cookies: CART,
    })
    expect(status).toBe(200)
    expect(calls[0]?.body).toEqual({ option_id: "so_1" })
  })
})

describe("payment", () => {
  it("lists providers for the cart's region", async () => {
    const calls = stubMedusa({
      "GET /store/carts/cart_1": jsonResponse({ cart: { region_id: "reg_1" } }),
      "GET /store/payment-providers": jsonResponse({
        payment_providers: [{ id: "pp_test", is_enabled: true }],
      }),
    })
    const { json } = await call("/api/checkout/payment-providers", { cookies: CART })

    expect(calls[1]?.search.get("region_id")).toBe("reg_1")
    expect(json).toEqual([{ id: "pp_test" }])
  })

  const SESSION_ANSWERS = {
    "POST /store/payment-collections": jsonResponse({ payment_collection: { id: "pc_1" } }),
    "POST /store/payment-collections/pc_1/payment-sessions": jsonResponse({
      payment_collection: {
        id: "pc_1",
        payment_sessions: [
          {
            id: "ps_1",
            provider_id: "pp_test",
            amount: 180.3,
            currency_code: "brl",
            status: "pending",
            data: { provider_internal: "drop me" },
          },
        ],
      },
    }),
  }

  it("creates a session in two steps, in cents, without provider data", async () => {
    const calls = stubMedusa(SESSION_ANSWERS)
    const { status, json } = await call("/api/checkout/payment", {
      body: { provider_id: "pp_test" },
      cookies: CART,
    })

    expect(status).toBe(200)
    expect(calls.map((upstream) => upstream.body)).toEqual([
      { cart_id: "cart_1" },
      { provider_id: "pp_test" },
    ])
    expect(json).toEqual({
      id: "ps_1",
      provider_id: "pp_test",
      amount: 18030,
      currency_code: "brl",
      status: "pending",
      data: {},
    })
  })

  it("answers 502 when upstream has no session for the provider", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    stubMedusa(SESSION_ANSWERS)
    const { status } = await call("/api/checkout/payment", {
      body: { provider_id: "pp_other" },
      cookies: CART,
    })
    expect(status).toBe(502)
  })

  it("refuses provider input until DEC-09 is decided", async () => {
    const calls = stubMedusa()
    const { status } = await call("/api/checkout/payment", {
      body: { provider_id: "pp_test", data: { card: "fictional" } },
      cookies: CART,
    })
    expect(status).toBe(400)
    expect(calls).toEqual([])
  })

  it("answers not_implemented for the payment status, which needs BE-05.2", async () => {
    const { status, json } = await call("/api/checkout/payment-status", { cookies: CART })
    expect(status).toBe(501)
    expect(json).toEqual({ code: "not_implemented", message: expect.any(String) as string })
  })
})
