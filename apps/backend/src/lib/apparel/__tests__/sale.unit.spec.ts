import { buildSalePriceList } from "../sale"

describe("buildSalePriceList", () => {
  const sale = {
    title: "Promoção de exemplo",
    description: "Exemplo",
    prices: [{ variantId: "variant_1", regularAmount: 129.9, saleAmount: 89.9 }],
  }

  it("builds an active sale holding the lower price, in major units", () => {
    expect(buildSalePriceList(sale)).toEqual({
      title: sale.title,
      description: sale.description,
      type: "sale",
      status: "active",
      starts_at: null,
      ends_at: null,
      prices: [{ variant_id: "variant_1", currency_code: "brl", amount: 89.9 }],
    })
  })

  it("passes the dates on", () => {
    const list = buildSalePriceList({
      ...sale,
      startsAt: "2030-01-01T00:00:00.000Z",
      endsAt: "2030-01-31T00:00:00.000Z",
    })

    expect(list.starts_at).toBe("2030-01-01T00:00:00.000Z")
    expect(list.ends_at).toBe("2030-01-31T00:00:00.000Z")
  })

  it.each([
    ["equal to the regular price", 129.9, /below/],
    ["above the regular price", 150, /below/],
    ["zero", 0, /two decimals/],
    ["with three decimals", 20.555, /two decimals/],
  ])("rejects a sale price %s", (_name, saleAmount, message) => {
    const prices = [{ variantId: "variant_1", regularAmount: 129.9, saleAmount }]

    expect(() => buildSalePriceList({ ...sale, prices })).toThrow(message)
  })

  it("rejects a sale with no variants", () => {
    expect(() => buildSalePriceList({ ...sale, prices: [] })).toThrow(/at least one/)
  })
})
