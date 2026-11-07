import { beforeEach, describe, expect, it } from "vitest"
import { centsToInput, priceFilterSchema } from "#shared/schemas/price-filter"
import { resetDataSources } from "~/data"
import { productFixtures } from "~/data/mock/fixtures"
import type { ListingState } from "~/lib/listing"
import {
  LISTING_PAGE_SIZE,
  activeFilterCount,
  filterLabel,
  paginationItems,
  parseListingState,
  toFiltersQuery,
  toListQuery,
  toProductCard,
  toRouteQuery,
  withOption,
} from "~/lib/listing"

const state = (patch: Partial<ListingState> = {}): ListingState => ({
  options: {},
  order: "newest",
  page: 1,
  ...patch,
})

describe("listing state in the URL", () => {
  it("has defaults for an empty URL", () => {
    expect(parseListingState({})).toEqual(state())
  })

  it("reads every filter, the order and the page", () => {
    expect(
      parseListingState({
        tamanho: "M",
        cor: "Azul",
        preco_min: "5000",
        preco_max: "9000",
        ordem: "price_asc",
        pagina: "3",
      }),
    ).toEqual({
      options: { Tamanho: "M", Cor: "Azul" },
      minPrice: 5000,
      maxPrice: 9000,
      order: "price_asc",
      page: 3,
    })
  })

  it.each([
    ["an unknown order", { ordem: "cheapest" }],
    ["a page that is no number", { pagina: "abc" }],
    ["page zero", { pagina: "0" }],
    ["a negative price", { preco_min: "-1" }],
    ["a fractional price", { preco_max: "10.5" }],
    ["a blank option", { tamanho: "  " }],
    ["an option longer than the API accepts", { cor: "x".repeat(101) }],
    ["a minimum above the maximum", { preco_min: "9000", preco_max: "5000" }],
  ])("drops %s, which the API would refuse", (_name, query) => {
    expect(parseListingState(query)).toEqual(state())
  })

  it("takes the first of a repeated parameter", () => {
    expect(parseListingState({ tamanho: ["M", "G"] }).options).toEqual({ Tamanho: "M" })
  })

  it("leaves defaults out of the URL and keeps parameters of others", () => {
    expect(toRouteQuery(state(), { utm_source: "x", pagina: "2" })).toEqual({ utm_source: "x" })
  })

  it("comes back the same after a round trip", () => {
    const full = state({
      options: { Tamanho: "G", Cor: "Verde" },
      minPrice: 100,
      maxPrice: 200,
      order: "on_sale",
      page: 2,
    })

    const query = toRouteQuery(full) as Record<string, string>

    expect(parseListingState(query)).toEqual(full)
  })
})

describe("listing queries", () => {
  it("turns the state into the catalog contract", () => {
    const current = state({ options: { Cor: "Azul" }, minPrice: 100, order: "price_desc", page: 3 })

    expect(toListQuery(current, { category_handle: "a" })).toEqual({
      category_handle: "a",
      option_values: { Cor: ["Azul"] },
      min_price: 100,
      order: "price_desc",
      limit: LISTING_PAGE_SIZE,
      offset: 2 * LISTING_PAGE_SIZE,
    })
  })

  it("sends no filter that was not chosen", () => {
    expect(toFiltersQuery(state(), { collection_handle: "b" })).toEqual({ collection_handle: "b" })
  })

  it("counts the price range as one filter", () => {
    expect(activeFilterCount(state())).toBe(0)
    expect(activeFilterCount(state({ options: { Cor: "Azul" }, minPrice: 1, maxPrice: 2 }))).toBe(2)
  })

  it("adds, replaces and removes one option", () => {
    const current = state({ options: { Cor: "Azul", Tamanho: "M" } })

    expect(withOption(current, "Cor", "Verde")).toEqual({ Cor: "Verde", Tamanho: "M" })
    expect(withOption(current, "Cor", undefined)).toEqual({ Tamanho: "M" })
  })
})

describe("filterLabel", () => {
  it("adds the value only when there is one", () => {
    expect(filterLabel("Cor", undefined)).toBe("Cor")
    expect(filterLabel("Cor", "Azul")).toBe("Cor: Azul")
  })
})

describe("paginationItems", () => {
  it.each([
    [1, 1, [1]],
    [1, 3, [1, 2, 3]],
    [5, 9, [1, null, 4, 5, 6, null, 9]],
    [1, 9, [1, 2, null, 9]],
    [9, 9, [1, null, 8, 9]],
  ])("page %i of %i", (page, count, expected) => {
    expect(paginationItems(page, count)).toEqual(expected)
  })
})

describe("toProductCard", () => {
  const product = productFixtures[0]!

  it("uses the lowest price and its compare-at price", () => {
    const cheap = structuredClone(product)
    cheap.variants[1]!.calculated_price = {
      calculated_amount: 100,
      compare_at_amount: 200,
      currency_code: "brl",
    }

    expect(toProductCard(cheap)).toMatchObject({ price: 100, compareAt: 200 })
  })

  it("is in stock while any variant has units, even with another size sold out", () => {
    expect(toProductCard(product).stock).toBe("in")
  })

  it("is out of stock only when every variant is", () => {
    const soldOut = structuredClone(product)
    for (const variant of soldOut.variants) variant.inventory_quantity = 0

    expect(toProductCard(soldOut).stock).toBe("out")
  })

  it("carries no variants, so the page payload stays small", () => {
    expect(Object.keys(toProductCard(product))).not.toContain("variants")
  })
})

describe("priceFilterSchema", () => {
  it.each([
    ["49", 4900],
    ["49,9", 4990],
    ["49,90", 4990],
    ["49.90", 4990],
    [" 19,99 ", 1999],
  ])("reads %s as cents", (text, cents) => {
    expect(priceFilterSchema.parse({ min: text, max: "" }).min).toBe(cents)
  })

  it("leaves an empty field out", () => {
    expect(priceFilterSchema.parse({ min: "", max: "" })).toEqual({
      min: undefined,
      max: undefined,
    })
  })

  it.each(["abc", "1,234", "-5", "1.000,00"])("refuses %s", (text) => {
    expect(priceFilterSchema.safeParse({ min: text, max: "" }).success).toBe(false)
  })

  it("refuses a minimum above the maximum, on the maximum", () => {
    const result = priceFilterSchema.safeParse({ min: "90", max: "50" })

    expect(result.error?.issues[0]).toMatchObject({ message: "order", path: ["max"] })
  })

  it("fills the inputs from cents", () => {
    expect(centsToInput(undefined)).toBe("")
    expect(centsToInput(5000)).toBe("50")
    expect(centsToInput(4990)).toBe("49,90")
  })
})

describe("listFacets on the mock source", () => {
  beforeEach(() => {
    useRuntimeConfig().public.dataSource = "mock"
    resetDataSources()
  })

  const valuesOf = (
    facets: Awaited<ReturnType<ReturnType<typeof useProducts>["listFacets"]>>,
    title: string,
  ) => facets.options.find((option) => option.title === title)?.values

  it("offers the values of the category, with counts and the price range", async () => {
    const facets = await useProducts().listFacets({ category_handle: "moletons-exemplo" })

    expect(valuesOf(facets, "Tamanho")).toEqual([
      { value: "G", count: 1 },
      { value: "M", count: 1 },
    ])
    expect(facets.price).toEqual({ min: 12990, max: 12990 })
  })

  it("does not narrow an option by its own filter, only by the others", async () => {
    const facets = await useProducts().listFacets({
      category_handle: "camisetas-exemplo",
      option_values: { Cor: ["Branco"], Tamanho: ["P"] },
    })

    expect(valuesOf(facets, "Cor")?.map(({ value }) => value)).toEqual(["Branco", "Preto"])
    expect(valuesOf(facets, "Tamanho")?.map(({ value }) => value)).toEqual(["G", "M", "P"])
  })

  it("keeps the price range when the price filter leaves nothing", async () => {
    const facets = await useProducts().listFacets({
      category_handle: "moletons-exemplo",
      max_price: 1,
    })

    expect(facets.price).toEqual({ min: 12990, max: 12990 })
    expect(facets.options[0]?.values).toEqual([])
  })

  it("has no range for a category without products", async () => {
    const facets = await useProducts().listFacets({ category_handle: "nada" })

    expect(facets.price).toBeNull()
  })

  it("still lists a product whose chosen size is sold out, like the API", async () => {
    const { products } = await useProducts().listProducts({
      collection_handle: "colecao-exemplo",
      option_values: { Tamanho: ["G"], Cor: ["Branco"] },
    })

    expect(products.map(({ handle }) => handle)).toEqual(["camiseta-ficticia-alfa"])
  })
})
