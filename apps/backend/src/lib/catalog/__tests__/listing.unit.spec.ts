import {
  buildFacets,
  type CatalogProduct,
  type CatalogProductRow,
  filterCatalog,
  sortCatalog,
  sumUnitsSold,
  toCatalogProduct,
  type VariantAvailability,
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

/** Every variant has stock unless `availability` says otherwise. */
function item(
  id: string,
  grid: [size: string, color: string][],
  overrides: Partial<CatalogProductRow> = {},
  price?: { calculated_amount: number; original_amount: number },
  availability: VariantAvailability = {},
): CatalogProduct {
  const source = row(id, grid, overrides, price)
  const stocked = Object.fromEntries(
    (source.variants ?? []).map((variant) => [variant.id, { availability: 5 }]),
  )
  const mapped = toCatalogProduct(source, { ...stocked, ...availability })
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

  it("returns a product's sizes in the grid's order, with unknown ones after, and keeps colours", () => {
    const product = toCatalogProduct(
      row("a", [
        ["GG", "Preto"],
        ["Especial", "Branco"],
        ["G", "Preto"],
        ["P", "Azul"],
      ]),
      {},
    )?.product
    const valuesOf = (title: string) =>
      product?.options.find((option) => option.title === title)?.values.map(({ value }) => value)

    expect(valuesOf("Tamanho")).toEqual(["P", "G", "GG", "Especial"])
    expect(valuesOf("Cor")).toEqual(["Preto", "Branco", "Preto", "Azul"])
  })

  describe("public stock", () => {
    const variantWith = (availability: number | null, overrides = {}) => {
      const source = row("a", [["P", "Preto"]])
      source.variants = source.variants?.map((variant) => ({ ...variant, ...overrides }))
      return toCatalogProduct(source, { a_P_Preto: { availability } })?.product.variants[0]
    }

    it.each([
      [0, 0, false],
      [1, 1, true],
      [9, 9, true],
      [10, 10, true],
      [11, 10, true],
      [250, 10, true],
    ])("shows %i units as %i, in stock: %s", (units, shown, in_stock) => {
      expect(variantWith(units)).toMatchObject({ inventory_quantity: shown, in_stock })
    })

    it("keeps every quantity below the cap exact, so a low-stock status can read it", () => {
      for (let units = 1; units < 10; units += 1) {
        expect(variantWith(units)?.inventory_quantity).toBe(units)
      }
    })

    it("sells an untracked or backorder variant, with no number to show", () => {
      expect(variantWith(null, { manage_inventory: false })).toMatchObject({
        inventory_quantity: 0,
        in_stock: true,
      })
      expect(variantWith(0, { allow_backorder: true })).toMatchObject({
        inventory_quantity: 0,
        in_stock: true,
      })
    })
  })

  describe("colour value", () => {
    const colored = (metadata: unknown) =>
      toCatalogProduct(
        row(
          "a",
          [
            ["P", "Preto"],
            ["P", "Branco"],
          ],
          { metadata },
        ),
        {},
      )?.product
    const colorValues = (metadata: unknown) => {
      const option = colored(metadata)?.options.find(({ title }) => title === "Cor")
      return Object.fromEntries((option?.values ?? []).map((v) => [v.value, v.color_hex]))
    }

    it("reads the product's flat key, and leaves a colour without one to its name", () => {
      expect(colorValues({ "color_hex:Preto": "#111111" })).toEqual({
        Preto: "#111111",
        Branco: null,
      })
    })

    it("gives the value on the variant's options too, and none to a size", () => {
      const [variant] =
        colored({ "color_hex:Preto": "#111111", "color_hex:P": "#222222" })?.variants ?? []
      expect(variant?.options.map((option) => option.color_hex)).toEqual([null, "#111111"])
    })

    it("ignores a bad value instead of passing it on", () => {
      expect(colorValues({ "color_hex:Preto": "preto" }).Preto).toBeNull()
    })

    it("gives each product its own value for the same colour name", () => {
      const first = item("one", [["P", "Azul"]], { metadata: { "color_hex:Azul": "#000080" } })
      const second = item("two", [["P", "Azul"]], { metadata: { "color_hex:Azul": "#87ceeb" } })
      const valueOf = ({ product }: CatalogProduct) => product.variants[0]?.options[1]?.color_hex

      expect(valueOf(first)).toBe("#000080")
      expect(valueOf(second)).toBe("#87ceeb")
    })

    it("does not leave the colour keys in the public metadata", () => {
      expect(colored({ fabric: "Exemplo", "color_hex:Preto": "#111111" })?.metadata).toEqual({
        fabric: "Exemplo",
      })
    })
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

  describe("with stock", () => {
    const soldOut = { availability: 0 }
    // P in black is sold out, M in black and P in white are not.
    const product = item(
      "stock",
      [
        ["P", "Preto"],
        ["M", "Preto"],
        ["P", "Branco"],
      ],
      {},
      undefined,
      { stock_P_Preto: soldOut },
    )

    it("does not match a variant that is sold out, even when each value has stock elsewhere", () => {
      const query = { option_values: { Tamanho: ["P"], Cor: ["Preto"] } }
      expect(filterCatalog([product], query)).toEqual([])
    })

    it("matches the variants still in stock", () => {
      expect(ids(filterCatalog([product], { option_values: { Tamanho: ["M"] } }))).toEqual([
        "stock",
      ])
      expect(ids(filterCatalog([product], { option_values: { Cor: ["Branco"] } }))).toEqual([
        "stock",
      ])
    })

    it("drops a product for a value with no stock at all", () => {
      const white = item("white", [["G", "Branco"]], {}, undefined, { white_G_Branco: soldOut })
      expect(filterCatalog([white], { option_values: { Tamanho: ["G"] } })).toEqual([])
    })

    it("keeps a sold-out product in a listing with no size or colour filter", () => {
      const white = item("white", [["G", "Branco"]], {}, undefined, { white_G_Branco: soldOut })
      expect(ids(filterCatalog([white], {}))).toEqual(["white"])
    })
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

  const facetOf = (facets: ReturnType<typeof buildFacets>, title: string) =>
    facets.options.find((facet) => facet.title === title)?.values
  const values = (facets: ReturnType<typeof buildFacets>, title: string) =>
    facetOf(facets, title)?.map(({ value, count }) => ({ value, count }))

  it("counts products once per value and gives the price range", () => {
    const facets = buildFacets([one, two], {})
    expect(values(facets, "Tamanho")).toEqual([
      { value: "P", count: 2 },
      { value: "M", count: 1 },
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

  it("orders the size facet by the grid, with unknown sizes after, and colours by text", () => {
    const product = item("grid", [
      ["XGG", "Preto"],
      ["Especial", "Azul"],
      ["GG", "Preto"],
      ["G", "Preto"],
      ["M", "Preto"],
      ["P", "Preto"],
    ])
    const facets = buildFacets([product], {})

    expect(values(facets, "Tamanho")?.map(({ value }) => value)).toEqual([
      "P",
      "M",
      "G",
      "GG",
      "XGG",
      "Especial",
    ])
    expect(values(facets, "Cor")?.map(({ value }) => value)).toEqual(["Azul", "Preto"])
  })

  it("counts only variants in stock, on the same variant as the other filters", () => {
    const product = item(
      "stock",
      [
        ["P", "Preto"],
        ["M", "Preto"],
        ["P", "Branco"],
        ["G", "Branco"],
      ],
      {},
      undefined,
      { stock_P_Preto: { availability: 0 }, stock_G_Branco: { availability: 0 } },
    )

    const all = buildFacets([product], {})
    expect(values(all, "Tamanho")).toEqual([
      { value: "P", count: 1 },
      { value: "M", count: 1 },
    ])
    expect(values(all, "Cor")).toEqual([
      { value: "Branco", count: 1 },
      { value: "Preto", count: 1 },
    ])

    const black = buildFacets([product], { option_values: { Cor: ["Preto"] } })
    expect(values(black, "Tamanho")).toEqual([{ value: "M", count: 1 }])
    const small = buildFacets([product], { option_values: { Tamanho: ["P"] } })
    expect(values(small, "Cor")).toEqual([{ value: "Branco", count: 1 }])
  })

  it("leaves out a value with nothing in stock", () => {
    const product = item("gone", [["G", "Cinza"]], {}, undefined, {
      gone_G_Cinza: { availability: 0 },
    })
    const facets = buildFacets([product], {})

    expect(values(facets, "Tamanho")).toEqual([])
    expect(values(facets, "Cor")).toEqual([])
  })

  it("agrees with the filter on the price range", () => {
    const sold = item("gone", [["G", "Cinza"]], {}, undefined, {
      gone_G_Cinza: { availability: 0 },
    })
    expect(buildFacets([sold], {}).price).toEqual({ min: 100, max: 100 })
    expect(buildFacets([sold], { option_values: { Cor: ["Cinza"] } }).price).toBeNull()
  })

  describe("colour value", () => {
    const withValue = (id: string, hex?: string) =>
      item(id, [["P", "Azul"]], { metadata: hex ? { "color_hex:Azul": hex } : {} })

    const blue = (items: CatalogProduct[]) =>
      facetOf(buildFacets(items, {}), "Cor")?.find(({ value }) => value === "Azul")

    it("gives each colour its value, and null to one with none and to sizes", () => {
      expect(blue([withValue("a", "#000080")])).toEqual({
        value: "Azul",
        count: 1,
        color_hex: "#000080",
      })
      expect(blue([withValue("a")])?.color_hex).toBeNull()
      expect(
        facetOf(buildFacets([withValue("a", "#000080")], {}), "Tamanho")?.[0]?.color_hex,
      ).toBeNull()
    })

    it("uses the value most products give the name, with a stable tie", () => {
      const items = [
        withValue("a", "#87ceeb"),
        withValue("b", "#000080"),
        withValue("c", "#87ceeb"),
      ]
      expect(blue(items)).toMatchObject({ count: 3, color_hex: "#87ceeb" })
      expect(blue([withValue("a", "#87ceeb"), withValue("b", "#000080")])?.color_hex).toBe(
        "#000080",
      )
    })
  })

  it("has no range when nothing matches", () => {
    expect(buildFacets([one], { q: "nada" }).price).toBeNull()
  })
})
