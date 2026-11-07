import {
  type ApparelGrid,
  buildApparelOptions,
  buildApparelVariants,
  buildSku,
  planInventoryLevels,
  planStockBySku,
} from "../variants"

// Example only: the real size grid and colours are pending in Q-03, and nothing in the code depends on these.
const EXAMPLE_GRID: ApparelGrid = {
  skuPrefix: "Camiseta Exemplo",
  sizes: ["Tam-1", "Tam-2", "Tam-3"],
  colors: ["Preto", "Cinza Mescla"],
  price: 129.9,
}

describe("buildApparelVariants", () => {
  it("creates one variant and one SKU per combination", () => {
    const variants = buildApparelVariants(EXAMPLE_GRID)

    expect(variants).toHaveLength(6)
    expect(new Set(variants.map((variant) => variant.sku)).size).toBe(6)
    expect(variants[0]).toEqual({
      title: "Tam-1 / Preto",
      sku: "CAMISETA-EXEMPLO-PRETO-TAM-1",
      manage_inventory: true,
      allow_backorder: false,
      options: { Tamanho: "Tam-1", Cor: "Preto" },
      prices: [{ currency_code: "brl", amount: 129.9 }],
    })
  })

  it("accepts any grid, since sizes and colours are data", () => {
    const variants = buildApparelVariants({ ...EXAMPLE_GRID, sizes: ["Único"], colors: ["Vinho"] })

    expect(variants.map((variant) => variant.sku)).toEqual(["CAMISETA-EXEMPLO-VINHO-UNICO"])
  })

  it("keeps each SKU when the lists change order or grow", () => {
    const skuOf = (grid: ApparelGrid) =>
      Object.fromEntries(buildApparelVariants(grid).map(({ title, sku }) => [title, sku]))
    const original = skuOf(EXAMPLE_GRID)

    const reordered = skuOf({
      ...EXAMPLE_GRID,
      sizes: [...EXAMPLE_GRID.sizes].reverse(),
      colors: [...EXAMPLE_GRID.colors].reverse(),
    })
    const grown = skuOf({ ...EXAMPLE_GRID, sizes: [...EXAMPLE_GRID.sizes, "Tam-4"] })

    expect(reordered).toEqual(original)
    expect(grown).toEqual(expect.objectContaining(original))
  })

  it("removes accents and symbols from the SKU", () => {
    expect(buildSku("Coleção: Rua", "2/3", "Açaí & Limão")).toBe("COLECAO-RUA-ACAI-LIMAO-2-3")
  })

  it.each([
    ["no sizes", { sizes: [] }, /size/],
    ["no colours", { colors: [] }, /colour/],
    ["a repeated size", { sizes: ["A", "A"] }, /listed twice/],
    ["a repeated colour", { colors: ["Preto", "Preto"] }, /listed twice/],
    ["sizes that differ only in case", { sizes: ["g", "G"] }, /share the SKU/],
    ["colours that reach one SKU", { colors: ["Azul claro", "Azul-Claro"] }, /share the SKU/],
    ["a value with no letter or digit", { sizes: ["★"] }, /no letter or digit/],
    ["an empty prefix", { skuPrefix: " - " }, /no letter or digit/],
  ])("rejects %s", (_name, change, message) => {
    expect(() => buildApparelVariants({ ...EXAMPLE_GRID, ...change })).toThrow(message)
  })

  it.each([0, -10, Number.NaN, Number.POSITIVE_INFINITY, 20.555])(
    "rejects a price of %s",
    (price) => {
      expect(() => buildApparelVariants({ ...EXAMPLE_GRID, price })).toThrow(/two decimals/)
    },
  )

  it.each([20.5, 0.07, 129.9, 1999.99])("keeps %s as major units, not cents", (price) => {
    const [variant] = buildApparelVariants({ ...EXAMPLE_GRID, price })

    expect(variant?.prices).toEqual([{ currency_code: "brl", amount: price }])
  })
})

describe("buildApparelOptions", () => {
  it("uses the given values under the titles the store filters by", () => {
    expect(buildApparelOptions(EXAMPLE_GRID)).toEqual([
      { title: "Tamanho", values: EXAMPLE_GRID.sizes },
      { title: "Cor", values: EXAMPLE_GRID.colors },
    ])
  })
})

describe("planStockBySku", () => {
  const variants = buildApparelVariants(EXAMPLE_GRID)

  it("sets the stock given and starts the rest at zero", () => {
    const stock = planStockBySku(EXAMPLE_GRID, variants, [
      { size: "Tam-2", color: "Preto", quantity: 7 },
    ])

    expect(Object.keys(stock)).toHaveLength(6)
    expect(stock["CAMISETA-EXEMPLO-PRETO-TAM-2"]).toBe(7)
    expect(stock["CAMISETA-EXEMPLO-PRETO-TAM-1"]).toBe(0)
  })

  it.each([
    ["a size outside the grid", { size: "Outro", color: "Preto", quantity: 1 }, /not in the grid/],
    ["a negative quantity", { size: "Tam-1", color: "Preto", quantity: -1 }, /whole number/],
    ["a fractional quantity", { size: "Tam-1", color: "Preto", quantity: 1.5 }, /whole number/],
  ])("rejects %s", (_name, entry, message) => {
    expect(() => planStockBySku(EXAMPLE_GRID, variants, [entry])).toThrow(message)
  })

  it("rejects the same combination twice", () => {
    const entry = { size: "Tam-1", color: "Preto", quantity: 1 }

    expect(() => planStockBySku(EXAMPLE_GRID, variants, [entry, entry])).toThrow(/twice/)
  })
})

describe("planInventoryLevels", () => {
  it("creates one level per variant at the location", () => {
    const rows = [
      { sku: "A", inventory_items: [{ inventory_item_id: "iitem_a" }] },
      { sku: "B", inventory_items: [{ inventory_item_id: "iitem_b" }] },
    ]

    expect(planInventoryLevels(rows, { A: 3, B: 0 }, "sloc_1")).toEqual([
      { inventory_item_id: "iitem_a", location_id: "sloc_1", stocked_quantity: 3 },
      { inventory_item_id: "iitem_b", location_id: "sloc_1", stocked_quantity: 0 },
    ])
  })

  it.each([
    ["no inventory item", { sku: "A", inventory_items: [] }],
    ["a SKU with no planned stock", { sku: "C", inventory_items: [{ inventory_item_id: "i" }] }],
    ["no SKU", { sku: null, inventory_items: [{ inventory_item_id: "i" }] }],
  ])("fails loudly for a variant with %s", (_name, row) => {
    expect(() => planInventoryLevels([row], { A: 3 }, "sloc_1")).toThrow()
  })
})
