import {
  buildFacets,
  type CatalogProduct,
  type CatalogProductRow,
  filterCatalog,
  sortCatalog,
  sumUnitsSold,
  toCatalogProduct,
} from "../listing"

// Example only: the real size grid is pending in Q-03.
const options = [
  { id: "opt_size", title: "Tamanho" },
  { id: "opt_color", title: "Cor" },
]
const value = (optionId: string, text: string) => ({
  id: `${optionId}_${text}`,
  value: text,
  option_id: optionId,
})

function row(
  id: string,
  grid: [size: string, color: string][],
  overrides: Partial<CatalogProductRow> = {},
  price: { calculated_amount: number; original_amount: number } = {
    calculated_amount: 100,
    original_amount: 100,
  },
): CatalogProductRow {
  return {
    id,
    title: `Camiseta ${id}`,
    handle: id,
    created_at: "2026-01-01T00:00:00.000Z",
    options: options.map((option) => ({
      ...option,
      values: grid.map(([size, color]) =>
        value(option.id, option.id === "opt_size" ? size : color),
      ),
    })),
    variants: grid.map(([size, color]) => ({
      id: `${id}_${size}_${color}`,
      title: `${size} / ${color}`,
      manage_inventory: true,
      allow_backorder: false,
      options: [value("opt_size", size), value("opt_color", color)],
      calculated_price: { ...price, currency_code: "brl" },
    })),
    ...overrides,
  }
}

function item(...args: Parameters<typeof row>): CatalogProduct {
  const mapped = toCatalogProduct(row(...args), {})
  if (!mapped) throw new Error("expected a product")
  return mapped
}

const ids = (items: CatalogProduct[]) => items.map((entry) => entry.product.id)

describe("toCatalogProduct", () => {
  it("returns only the public fields, whatever the row holds", () => {
    const leaky = {
      ...row("a", [["P", "Preto"]]),
      status: "draft",
      external_id: "erp-1",
      metadata: { fabric: "Tecido de exemplo", cost: 12.5, supplier: "Fornecedor" },
    }
    leaky.variants = leaky.variants?.map((variant) => ({
      ...variant,
      barcode: "000",
      prices: [{ amount: 1 }],
      inventory_items: [{ inventory: { location_levels: [] } }],
    }))

    const product = toCatalogProduct(leaky, {})?.product

    expect(product?.metadata).toEqual({ fabric: "Tecido de exemplo" })
    const text = JSON.stringify(product)
    for (const secret of ["cost", "supplier", "erp-1", "barcode", "prices", "inventory_items"]) {
      expect(text).not.toContain(secret)
    }
    expect(Object.keys(product?.variants[0] ?? {}).sort()).toEqual([
      "calculated_price",
      "id",
      "images",
      "in_stock",
      "inventory_quantity",
      "options",
      "product_id",
      "sku",
      "title",
    ])
  })

  it("hides internal and inactive categories", () => {
    const base = { handle: "h", name: "n" }
    const product = toCatalogProduct(
      row("a", [["P", "Preto"]], {
        categories: [
          { ...base, id: "public", is_active: true, is_internal: false },
          { ...base, id: "internal", is_active: true, is_internal: true },
          { ...base, id: "inactive", is_active: false, is_internal: false },
        ],
      }),
      {},
    )?.product

    expect(product?.categories.map((category) => category.id)).toEqual(["public"])
  })

  it("keeps invalid metadata from reaching the customer", () => {
    const product = toCatalogProduct(
      row("a", [["P", "Preto"]], { metadata: { weight_g: "x" } }),
      {},
    )
    expect(product?.product.metadata).toBeNull()
  })

  it("drops a variant with no price in the region, and a product left with none", () => {
    const base = row("a", [
      ["P", "Preto"],
      ["M", "Preto"],
    ])
    const [first, second] = base.variants ?? []
    const unpriced = { ...first!, calculated_price: null }

    const partly = toCatalogProduct({ ...base, variants: [unpriced, second!] }, {})

    expect(partly?.product.variants.map((variant) => variant.id)).toEqual([second?.id])
    expect(toCatalogProduct({ ...base, variants: [unpriced] }, {})).toBeNull()
  })

  it.each([
    ["stock left", { manage_inventory: true }, 3, 3, true],
    ["sold out", { manage_inventory: true }, 0, 0, false],
    ["no inventory item", { manage_inventory: true }, null, 0, false],
    ["backorder allowed", { manage_inventory: true, allow_backorder: true }, 0, 0, true],
    ["stock not tracked", { manage_inventory: false }, null, 0, true],
  ])("reports availability per variant: %s", (_name, flags, availability, quantity, inStock) => {
    const base = row("a", [["P", "Preto"]])
    const variants = base.variants?.map((variant) => ({ ...variant, ...flags }))

    const mapped = toCatalogProduct({ ...base, variants }, { a_P_Preto: { availability } })

    expect(mapped?.product.variants[0]).toMatchObject({
      inventory_quantity: quantity,
      in_stock: inStock,
    })
  })
})

describe("filterCatalog", () => {
  const blackP = item("black-p", [["P", "Preto"]])
  const mixed = item("mixed", [
    ["P", "Branco"],
    ["G", "Preto"],
  ])

  it("needs one variant holding every option value asked for", () => {
    const query = { option_values: { Tamanho: ["P"], Cor: ["Preto"] } }
    expect(ids(filterCatalog([blackP, mixed], query))).toEqual(["black-p"])
  })

  it("treats several values of one option as alternatives", () => {
    const query = { option_values: { Tamanho: ["P", "G"] } }
    expect(ids(filterCatalog([blackP, mixed], query))).toEqual(["black-p", "mixed"])
  })

  it("finds nothing for an option no product has", () => {
    expect(filterCatalog([blackP], { option_values: { Gola: ["V"] } })).toEqual([])
  })

  it("compares the lowest variant price with a range given in cents, inclusive", () => {
    const cheap = item(
      "cheap",
      [["P", "Preto"]],
      {},
      {
        calculated_amount: 79.9,
        original_amount: 79.9,
      },
    )
    expect(ids(filterCatalog([cheap], { min_price: 7990, max_price: 7990 }))).toEqual(["cheap"])
    expect(filterCatalog([cheap], { min_price: 7991 })).toEqual([])
    expect(filterCatalog([cheap], { max_price: 7989 })).toEqual([])
  })

  it("filters by category and collection handle", () => {
    const taxon = item("taxon", [["P", "Preto"]], {
      categories: [{ id: "c", handle: "cat", name: "Categoria" }],
      collection: { id: "k", handle: "col", title: "Coleção" },
    })
    expect(ids(filterCatalog([taxon, blackP], { category_handle: "cat" }))).toEqual(["taxon"])
    expect(ids(filterCatalog([taxon, blackP], { collection_handle: "col" }))).toEqual(["taxon"])
  })

  it("searches name, categories and tags, ignoring case and accents", () => {
    const found = item("found", [["P", "Preto"]], {
      title: "Calção Listrado",
      categories: [{ id: "c", handle: "cat", name: "Verão" }],
      tags: [{ value: "Praia" }],
    })
    for (const q of ["calcao", "LISTRADO", "verao", "praia", "calcao praia"]) {
      expect(ids(filterCatalog([found], { q }))).toEqual(["found"])
    }
    expect(filterCatalog([found], { q: "calcao inverno" })).toEqual([])
  })
})

describe("sortCatalog", () => {
  const dated = (id: string, createdAt: string, amount = 100, original = amount) =>
    item(
      id,
      [["P", "Preto"]],
      { created_at: createdAt },
      { calculated_amount: amount, original_amount: original },
    )
  const older = dated("older", "2026-01-01", 50)
  const newer = dated("newer", "2026-03-01", 150)
  const small = dated("small-sale", "2026-02-01", 90, 100)
  const big = dated("big-sale", "2026-01-15", 50, 100)

  it("defaults to newest first and does not change the input", () => {
    const input = [older, newer]
    expect(ids(sortCatalog(input))).toEqual(["newer", "older"])
    expect(ids(input)).toEqual(["older", "newer"])
  })

  it("sorts by the lowest variant price", () => {
    expect(ids(sortCatalog([newer, older], "price_asc"))).toEqual(["older", "newer"])
    expect(ids(sortCatalog([older, newer], "price_desc"))).toEqual(["newer", "older"])
  })

  it("puts the biggest discount first and products not on sale last", () => {
    expect(ids(sortCatalog([older, small, big, newer], "on_sale"))).toEqual([
      "big-sale",
      "small-sale",
      "newer",
      "older",
    ])
  })

  it("ranks by units sold, with unsold products newest first", () => {
    const sold = new Map([
      ["older", 5],
      ["big-sale", 9],
    ])
    expect(ids(sortCatalog([older, newer, small, big], "best_selling", sold))).toEqual([
      "big-sale",
      "older",
      "newer",
      "small-sale",
    ])
  })

  it("breaks a full tie by ID, so pages do not overlap", () => {
    const b = dated("b", "2026-01-01")
    const a = dated("a", "2026-01-01")
    expect(ids(sortCatalog([b, a]))).toEqual(["a", "b"])
  })
})

describe("sumUnitsSold", () => {
  it("adds the quantities per product, across orders", () => {
    const units = sumUnitsSold([
      {
        items: [
          { product_id: "a", quantity: 2 },
          { product_id: "b", quantity: 1 },
        ],
      },
      {
        items: [
          { product_id: "a", quantity: 3 },
          { product_id: null, quantity: 9 },
        ],
      },
      { items: null },
    ])
    expect([...units]).toEqual([
      ["a", 5],
      ["b", 1],
    ])
  })
})

describe("buildFacets", () => {
  const one = item("one", [
    ["P", "Preto"],
    ["M", "Preto"],
  ])
  const two = item("two", [["P", "Branco"]], {}, { calculated_amount: 50, original_amount: 50 })

  const values = (facets: ReturnType<typeof buildFacets>, title: string) =>
    facets.options.find((facet) => facet.title === title)?.values

  it("counts products once per value and gives the price range", () => {
    const facets = buildFacets([one, two], {})
    expect(values(facets, "Tamanho")).toEqual([
      { value: "M", count: 1 },
      { value: "P", count: 2 },
    ])
    expect(values(facets, "Cor")).toEqual([
      { value: "Branco", count: 1 },
      { value: "Preto", count: 1 },
    ])
    expect(facets.price).toEqual({ min: 50, max: 100 })
  })

  it("keeps the other values of a picked option, and narrows the other option", () => {
    const facets = buildFacets([one, two], { option_values: { Cor: ["Branco"] } })
    expect(values(facets, "Cor")).toEqual([
      { value: "Branco", count: 1 },
      { value: "Preto", count: 1 },
    ])
    expect(values(facets, "Tamanho")).toEqual([{ value: "P", count: 1 }])
  })

  it("applies the price filter to the options but not to the range", () => {
    const facets = buildFacets([one, two], { max_price: 5000 })
    expect(values(facets, "Tamanho")).toEqual([{ value: "P", count: 1 }])
    expect(facets.price).toEqual({ min: 50, max: 100 })
  })

  it("has no range when nothing matches", () => {
    expect(buildFacets([one], { q: "nada" }).price).toBeNull()
  })
})
