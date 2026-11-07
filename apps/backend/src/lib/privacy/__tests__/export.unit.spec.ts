import { buildCustomerExport } from "../export"

// Fictional, and only assembled at run time.
const cpf = `${"123456789"}${"09"}`
const generatedAt = new Date("2026-01-02T03:04:05.000Z")
const address = {
  first_name: "Ana",
  last_name: "Teste",
  address_1: "Rua Exemplo, 1",
  city: "Cidade Exemplo",
  postal_code: "00000-000",
  country_code: "br",
}

function build(overrides: Partial<Parameters<typeof buildCustomerExport>[0]> = {}) {
  return buildCustomerExport({
    customer: { id: "cus_1", email: "ana@example.com", first_name: "Ana" },
    carts: [],
    orders: [],
    generatedAt,
    ...overrides,
  })
}

describe("buildCustomerExport", () => {
  it("states when it was generated and maps the customer", () => {
    const result = build()

    expect(result.generated_at).toBe("2026-01-02T03:04:05.000Z")
    expect(result.customer).toMatchObject({
      id: "cus_1",
      email: "ana@example.com",
      first_name: "Ana",
      last_name: null,
      cpf: null,
    })
  })

  it("includes the customer's addresses", () => {
    const result = build({
      customer: { id: "cus_1", addresses: [address] },
    })

    expect(result.addresses).toEqual([expect.objectContaining(address)])
  })

  it("reads a CPF kept in cart, order and customer metadata", () => {
    const metadata = { cpf }

    const result = build({
      customer: { id: "cus_1", metadata },
      carts: [{ id: "cart_1", metadata }],
      orders: [{ id: "order_1", metadata }],
    })

    expect(result.customer.cpf).toBe(cpf)
    expect(result.carts[0]?.cpf).toBe(cpf)
    expect(result.orders[0]?.cpf).toBe(cpf)
  })

  it("reports an invalid CPF as no CPF but still shows what is stored", () => {
    const result = build({ carts: [{ id: "cart_1", metadata: { cpf: "not-a-cpf", gift: true } }] })

    expect(result.carts[0]?.cpf).toBeNull()
    expect(result.carts[0]?.metadata).toEqual({ cpf: "not-a-cpf", gift: true })
  })

  it("maps an order with its addresses and items", () => {
    const result = build({
      orders: [
        {
          id: "order_1",
          display_id: 7,
          status: "pending",
          email: "ana@example.com",
          currency_code: "brl",
          total: 129,
          shipping_address: address,
          billing_address: null,
          items: [{ title: "Camiseta Teste", quantity: 1, unit_price: 129 }],
        },
      ],
    })

    expect(result.orders[0]).toMatchObject({
      id: "order_1",
      display_id: 7,
      total: 129,
      shipping_address: expect.objectContaining(address),
      billing_address: null,
      items: [{ title: "Camiseta Teste", quantity: 1, unit_price: 129 }],
    })
  })

  it("leaves out fields it does not name", () => {
    const customer = { id: "cus_1", created_by: "someone", has_account: true }

    const result = build({ customer })

    expect(result.customer).not.toHaveProperty("created_by")
    expect(result.customer).not.toHaveProperty("has_account")
  })

  it("copes with a customer who has no addresses, carts or orders", () => {
    const result = build({ customer: { id: "cus_1", addresses: null } })

    expect(result.addresses).toEqual([])
    expect(result.carts).toEqual([])
    expect(result.orders).toEqual([])
  })
})
