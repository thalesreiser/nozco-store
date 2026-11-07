import { describe, expect, it } from "vitest"
import {
  storeProductFacetsRequestSchema,
  storeProductListRequestSchema,
  storeProductRequestSchema,
} from "../src/index.js"

const base = { region_id: "reg_1" }

describe("storeProductListRequestSchema", () => {
  it("applies the default page", () => {
    expect(storeProductListRequestSchema.parse(base)).toEqual({ ...base, limit: 20, offset: 0 })
  })

  it("reads numbers and lists from a query string", () => {
    const parsed = storeProductListRequestSchema.parse({
      ...base,
      q: "  camiseta ",
      min_price: "1000",
      max_price: "2000",
      limit: "5",
      offset: "10",
      order: "best_selling",
      option_values: { Tamanho: "P", Cor: ["Preto", "Branco"] },
    })
    expect(parsed).toEqual({
      ...base,
      q: "camiseta",
      min_price: 1000,
      max_price: 2000,
      limit: 5,
      offset: 10,
      order: "best_selling",
      option_values: { Tamanho: ["P"], Cor: ["Preto", "Branco"] },
    })
  })

  it.each([
    ["no region", {}],
    ["an unknown parameter", { ...base, size: "P" }],
    ["an unknown order", { ...base, order: "random" }],
    ["a limit above the maximum", { ...base, limit: "101" }],
    ["a zero limit", { ...base, limit: "0" }],
    ["a negative offset", { ...base, offset: "-1" }],
    ["a price with decimals", { ...base, min_price: "10.5" }],
    ["an inverted price range", { ...base, min_price: "200", max_price: "100" }],
    ["an empty term", { ...base, q: "  " }],
    ["a term sent twice", { ...base, q: ["a", "b"] }],
    ["too many option values", { ...base, option_values: { Cor: Array(21).fill("x") } }],
    ["a nested option value", { ...base, option_values: { Cor: { a: "b" } } }],
  ])("refuses %s", (_name, input) => {
    expect(storeProductListRequestSchema.safeParse(input).success).toBe(false)
  })
})

describe("storeProductFacetsRequestSchema", () => {
  it("takes the filters and refuses the page and the order", () => {
    expect(storeProductFacetsRequestSchema.safeParse({ ...base, q: "x" }).success).toBe(true)
    expect(storeProductFacetsRequestSchema.safeParse({ ...base, limit: "5" }).success).toBe(false)
    expect(storeProductFacetsRequestSchema.safeParse({ ...base, order: "newest" }).success).toBe(
      false,
    )
  })
})

describe("storeProductRequestSchema", () => {
  it("needs the region and nothing else", () => {
    expect(storeProductRequestSchema.safeParse(base).success).toBe(true)
    expect(storeProductRequestSchema.safeParse({}).success).toBe(false)
    expect(storeProductRequestSchema.safeParse({ ...base, q: "x" }).success).toBe(false)
  })
})
