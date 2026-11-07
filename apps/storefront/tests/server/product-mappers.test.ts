import { describe, expect, it } from "vitest"
import {
  productFacetsResponse,
  productListResponse,
  productResponse,
} from "../../server/utils/store-mappers"

const optionValue = { id: "optval_1", value: "P", option_id: "opt_1" }

const variant = {
  id: "variant_1",
  product_id: "prod_1",
  title: "P / Preto",
  sku: "EXEMPLO-PRETO-P",
  inventory_quantity: 3,
  in_stock: true,
  options: [optionValue],
  images: [],
  calculated_price: { calculated_amount: 89.9, original_amount: 129.9, currency_code: "brl" },
}

const backendProduct = {
  id: "prod_1",
  title: "Camiseta Ficticia",
  handle: "camiseta-ficticia",
  subtitle: null,
  description: null,
  thumbnail: null,
  options: [{ id: "opt_1", title: "Tamanho", values: [optionValue] }],
  variants: [variant],
  images: [],
  categories: [{ id: "cat_1", handle: "cat", name: "Categoria" }],
  collection: { id: "col_1", handle: "col", title: "Coleção" },
  metadata: { fabric: "Tecido de exemplo", cost: 12 },
}

const priceWith = (calculated_amount: number, original_amount: number | null) =>
  productResponse.parse({
    product: {
      ...backendProduct,
      variants: [
        {
          ...variant,
          calculated_price: { calculated_amount, original_amount, currency_code: "brl" },
        },
      ],
    },
  }).variants[0]?.calculated_price

describe("product mappers", () => {
  it("converts to cents and gives a compare-at price only for a sale", () => {
    expect(priceWith(89.9, 129.9)).toEqual({
      calculated_amount: 8990,
      compare_at_amount: 12990,
      currency_code: "brl",
    })
    expect(priceWith(129.9, 129.9)?.compare_at_amount).toBeNull()
    expect(priceWith(129.9, 100)?.compare_at_amount).toBeNull()
    expect(priceWith(129.9, null)?.compare_at_amount).toBeNull()
  })

  it("maps the collection title to the taxon name", () => {
    const { collection } = productResponse.parse({ product: backendProduct })
    expect(collection).toEqual({ id: "col_1", handle: "col", name: "Coleção" })
  })

  it("keeps only known fields, and only garment metadata", () => {
    const parsed = productResponse.parse({
      product: {
        ...backendProduct,
        status: "published",
        variants: [{ ...variant, barcode: "000" }],
      },
    })
    expect(parsed.metadata).toEqual({ fabric: "Tecido de exemplo" })
    expect(JSON.stringify(parsed)).not.toMatch(/status|barcode|cost/)
  })

  it("survives invalid metadata instead of failing the listing", () => {
    const parsed = productResponse.parse({
      product: { ...backendProduct, metadata: { weight_g: "x" } },
    })
    expect(parsed.metadata).toBeNull()
  })

  it("keeps the page of a listing", () => {
    const parsed = productListResponse.parse({
      products: [backendProduct],
      count: 1,
      limit: 20,
      offset: 0,
    })
    expect(parsed).toMatchObject({ count: 1, limit: 20, offset: 0 })
    expect(parsed.products[0]?.variants[0]?.in_stock).toBe(true)
  })

  it("converts the facet price range to cents", () => {
    const options = [{ title: "Cor", values: [{ value: "Preto", count: 2 }] }]
    expect(productFacetsResponse.parse({ options, price: { min: 50.5, max: 100 } })).toEqual({
      options,
      price: { min: 5050, max: 10000 },
    })
    expect(productFacetsResponse.parse({ options, price: null }).price).toBeNull()
  })
})
