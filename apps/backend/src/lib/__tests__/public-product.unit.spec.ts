import { withoutPrivateProductFields } from "../public-product"

describe("withoutPrivateProductFields", () => {
  it("removes the private fields at any depth", () => {
    const body = {
      products: [
        {
          id: "prod_1",
          external_id: "erp-1",
          metadata: { cost: 12.5 },
          collection: { title: "Coleção", metadata: { cost: 1 } },
          variants: [
            {
              id: "variant_1",
              barcode: "000",
              ean: "000",
              upc: "000",
              hs_code: "000",
              mid_code: "000",
              metadata: { cost: 2 },
              prices: [{ amount: 1 }],
              inventory_items: [{ inventory: { location_levels: [{ stocked_quantity: 9 }] } }],
            },
          ],
        },
      ],
    }

    expect(withoutPrivateProductFields(body)).toEqual({
      products: [
        {
          id: "prod_1",
          collection: { title: "Coleção" },
          variants: [{ id: "variant_1" }],
        },
      ],
    })
  })

  it("keeps what the store needs, including the page and the calculated price", () => {
    const body = {
      products: [
        {
          variants: [
            { inventory_quantity: 3, calculated_price: { calculated_amount: 89.9, id: "p" } },
          ],
        },
      ],
      count: 1,
      limit: 50,
      offset: 0,
    }

    expect(withoutPrivateProductFields(body)).toEqual(body)
  })

  it("sends a date as the response would, and reaches inside a class instance", () => {
    class Row {
      metadata = { cost: 1 }
      id = "prod_1"
    }
    const at = new Date("2026-11-07T00:00:00.000Z")

    expect(withoutPrivateProductFields({ product: new Row(), at })).toEqual({
      product: { id: "prod_1" },
      at: at.toISOString(),
    })
  })

  it("passes an empty body and a missing field through", () => {
    expect(withoutPrivateProductFields(undefined)).toBeUndefined()
    expect(withoutPrivateProductFields(null)).toBeNull()
  })
})
