import { Modules } from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductTagsWorkflow,
} from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { buildSalePriceList } from "../../src/lib/apparel/sale"
import { queryList } from "../../src/lib/store-setup/query"
import { setupStore, type StoreSetupResult } from "../../src/lib/store-setup/setup-store"
import { createApparelProduct } from "../../src/workflows/create-apparel-product"

jest.setTimeout(120 * 1000)

type Variant = {
  id: string
  sku: string | null
  inventory_quantity: number
  in_stock: boolean
  calculated_price: { calculated_amount: number; original_amount: number | null }
}
type Product = {
  id: string
  handle: string
  metadata: Record<string, unknown> | null
  categories: { handle: string }[]
  collection: { handle: string; title: string } | null
  variants: Variant[]
}
type ListResponse = { products: Product[]; count: number; limit: number; offset: number }
type Facets = {
  options: { title: string; values: { value: string; count: number }[] }[]
  price: { min: number; max: number } | null
}
type Answer<T> = { status: number; data: T }

type FixtureInput = {
  price?: number
  sizes?: string[]
  colors?: string[]
  title?: string
  stock?: { size: string; color: string; quantity: number }[]
  product?: Record<string, unknown>
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("store catalog (BE-02.4)", () => {
      let setup: StoreSetupResult
      let headers: Record<string, string>

      // Example only: the real size grid is pending in Q-03.
      const createProduct = (handle: string, input: FixtureInput = {}) =>
        createApparelProduct(getContainer(), {
          skuPrefix: handle.toUpperCase(),
          sizes: input.sizes ?? ["Tam-1", "Tam-2"],
          colors: input.colors ?? ["Preto"],
          price: input.price ?? 100,
          stock: input.stock,
          stockLocationId: setup.stockLocationId,
          product: {
            title: input.title ?? `Camiseta ${handle}`,
            handle,
            status: "published",
            sales_channels: [{ id: setup.salesChannelId }],
            ...input.product,
          },
        })

      const get = <T>(path: string, params: Record<string, unknown> = {}) =>
        api.get(path, {
          headers,
          params: { region_id: setup.regionId, ...params },
          validateStatus: () => true,
        }) as Promise<Answer<T>>

      const list = async (params: Record<string, unknown> = {}) =>
        (await get<ListResponse>("/store/catalog/products", params)).data

      const handles = async (params: Record<string, unknown> = {}) =>
        (await list(params)).products.map((product) => product.handle)

      const facetsOf = async (params: Record<string, unknown> = {}) =>
        (await get<Facets>("/store/catalog/facets", params)).data

      beforeEach(async () => {
        const container = getContainer()
        setup = await setupStore(container)
        const [key] = await queryList<{ token: string }>(container, {
          entity: "api_key",
          fields: ["token"],
          filters: { id: setup.publishableApiKeyId },
        })
        headers = { "x-publishable-api-key": key?.token ?? "" }
      })

      it("answers bad requests with { code, message } and needs a publishable key", async () => {
        const bad = await get("/store/catalog/products", { size: "P" })
        expect(bad.status).toBe(400)
        expect(bad.data).toEqual({ code: "invalid_payload", message: expect.any(String) as string })

        const noRegion = await get("/store/catalog/facets", { region_id: "reg_missing" })
        expect(noRegion.status).toBe(400)
        expect(noRegion.data).toMatchObject({ code: "region_not_found" })

        const missing = await get("/store/catalog/products/no-such-product")
        expect(missing.status).toBe(404)
        expect(missing.data).toMatchObject({ code: "product_not_found" })

        const anonymous = (await api.get("/store/catalog/products", {
          params: { region_id: setup.regionId },
          validateStatus: () => true,
        })) as Answer<unknown>
        expect(anonymous.status).toBe(400)
      })

      it("filters by size and colour on one variant, and offers facets", async () => {
        await createProduct("both", { sizes: ["Tam-1"], colors: ["Preto", "Branco"] })
        await createProduct("mixed", { sizes: ["Tam-1", "Tam-2"], colors: ["Preto"] })

        const option_values = { Tamanho: ["Tam-2"], Cor: ["Preto"] }
        expect(await handles({ option_values })).toEqual(["mixed"])
        expect(await handles({ option_values: { Cor: "Branco" } })).toEqual(["both"])

        const facets = await facetsOf({ option_values: { Tamanho: ["Tam-1"] } })
        expect(facets.options).toEqual([
          {
            title: "Tamanho",
            values: [
              { value: "Tam-1", count: 2 },
              { value: "Tam-2", count: 1 },
            ],
          },
          {
            title: "Cor",
            values: [
              { value: "Branco", count: 1 },
              { value: "Preto", count: 2 },
            ],
          },
        ])
      })

      it("filters by price in cents, with a sale counting at its sale price", async () => {
        const container = getContainer()
        await createProduct("regular", { price: 100 })
        await createProduct("promo", { price: 129.9 })
        const [promo] = (await list({ q: "promo" })).products

        await createPriceListsWorkflow(container).run({
          input: {
            price_lists_data: [
              buildSalePriceList({
                title: "Promoção de exemplo",
                description: "Exemplo",
                prices: (promo?.variants ?? []).map((variant) => ({
                  variantId: variant.id,
                  regularAmount: 129.9,
                  saleAmount: 89.9,
                })),
              }),
            ],
          },
        })

        expect(await handles({ max_price: 8990 })).toEqual(["promo"])
        expect(await handles({ min_price: 8991 })).toEqual(["regular"])
        expect((await facetsOf({ max_price: 8990 })).price).toEqual({ min: 89.9, max: 100 })

        expect(await handles({ order: "on_sale" })).toEqual(["promo", "regular"])
        expect(await handles({ order: "price_desc" })).toEqual(["regular", "promo"])

        const [onSale] = (await list({ q: "promo" })).products
        expect(onSale?.variants[0]?.calculated_price).toEqual(
          expect.objectContaining({ calculated_amount: 89.9, original_amount: 129.9 }),
        )
      })

      it("sorts by units sold, ignoring canceled orders, and pages the result", async () => {
        const orders = getContainer().resolve(Modules.ORDER)
        const { productId: first } = await createProduct("first")
        const { productId: second } = await createProduct("second")
        await createProduct("third")

        const order = (productId: string, quantity: number, status?: "canceled") =>
          orders.createOrders({
            currency_code: "brl",
            region_id: setup.regionId,
            sales_channel_id: setup.salesChannelId,
            email: "cliente@example.com",
            status,
            items: [{ title: "Exemplo", quantity, unit_price: 100, product_id: productId }],
          })
        await order(first, 1)
        await order(second, 2)
        await order(first, 9, "canceled")

        const sold = await list({ order: "best_selling", limit: 2 })
        expect(sold.products.map((product) => product.handle)).toEqual(["second", "first"])
        expect(sold).toMatchObject({ count: 3, limit: 2, offset: 0 })

        const next = await list({ order: "best_selling", limit: 2, offset: 2 })
        expect(next.products.map((product) => product.handle)).toEqual(["third"])
      })

      it("reports availability per variant", async () => {
        await createProduct("stock", {
          stock: [{ size: "Tam-1", color: "Preto", quantity: 7 }],
        })

        const answer = await get<{ product: Product }>("/store/catalog/products/stock")
        const bySku = new Map(answer.data.product.variants.map((v) => [v.sku, v]))

        expect(bySku.get("STOCK-PRETO-TAM-1")).toMatchObject({
          inventory_quantity: 7,
          in_stock: true,
        })
        expect(bySku.get("STOCK-PRETO-TAM-2")).toMatchObject({
          inventory_quantity: 0,
          in_stock: false,
        })
      })

      it("searches name, category and tag, and filters by taxon handle", async () => {
        const container = getContainer()
        const { result: categories } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [{ name: "Verão", handle: "verao", is_active: true }],
          },
        })
        const { result: tags } = await createProductTagsWorkflow(container).run({
          input: { product_tags: [{ value: "Praia" }] },
        })
        const { result: collections } = await createCollectionsWorkflow(container).run({
          input: { collections: [{ title: "Coleção de exemplo", handle: "col-exemplo" }] },
        })
        await createProduct("alvo", {
          title: "Calção Listrado",
          product: {
            category_ids: [categories[0]?.id],
            tag_ids: [tags[0]?.id],
            collection_id: collections[0]?.id,
          },
        })
        await createProduct("outro")

        for (const q of ["calcao", "LISTRADO", "verao", "praia"]) {
          expect(await handles({ q })).toEqual(["alvo"])
        }
        expect(await handles({ q: "inexistente" })).toEqual([])
        expect(await handles({ category_handle: "verao" })).toEqual(["alvo"])
        expect(await handles({ collection_handle: "col-exemplo" })).toEqual(["alvo"])

        const [product] = (await list({ q: "calcao" })).products
        expect(product?.collection).toEqual(
          expect.objectContaining({ handle: "col-exemplo", title: "Coleção de exemplo" }),
        )
      })

      it("keeps a cost in metadata out of the standard product routes", async () => {
        const { productId } = await createProduct("custo", {
          product: { metadata: { fabric: "Tecido de exemplo", cost: 12.5 }, external_id: "erp-1" },
        })
        const [stored] = await queryList<{ metadata: Record<string, unknown> }>(getContainer(), {
          entity: "product",
          fields: ["metadata"],
          filters: { id: productId },
        })
        expect(stored?.metadata.cost).toBe(12.5)

        const fields =
          "+metadata,+external_id,*variants.calculated_price,+variants.inventory_quantity," +
          "+variants.barcode,*variants.prices," +
          "*variants.inventory_items.inventory.location_levels"
        for (const path of ["/store/products", `/store/products/${productId}`]) {
          const answer = await get<unknown>(path, { fields })
          const body = JSON.stringify(answer.data)

          expect(answer.status).toBe(200)
          expect(body).toContain("calculated_amount")
          expect(body).toContain("inventory_quantity")
          expect(body).not.toMatch(
            /"(metadata|external_id|barcode|prices|inventory_items|location_levels)"|erp-1/,
          )
          expect(body).not.toContain("cost")
        }
      })

      it("keeps a cost in metadata out of the other standard routes", async () => {
        const container = getContainer()
        const { result: categories } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              { name: "Categoria", handle: "cat-custo", is_active: true, metadata: { cost: 1 } },
            ],
          },
        })
        const { result: collections } = await createCollectionsWorkflow(container).run({
          input: {
            collections: [{ title: "Coleção", handle: "col-custo", metadata: { cost: 2 } }],
          },
        })
        const { productId } = await createProduct("custo-outras", {
          product: { category_ids: [categories[0]?.id ?? ""], collection_id: collections[0]?.id },
        })

        const answers = [
          // These two refuse the region_id that the helper sends by default.
          await get<unknown>("/store/collections", { fields: "+metadata", region_id: undefined }),
          await get<unknown>("/store/product-categories", {
            fields: "+metadata",
            region_id: undefined,
          }),
          await get<unknown>("/store/product-variants", {
            product_id: productId,
            fields: "+metadata,+barcode,+ean,+upc",
          }),
        ]
        for (const answer of answers) {
          const body = JSON.stringify(answer.data)

          expect(answer.status).toBe(200)
          expect(body).toContain('"id"')
          expect(body).not.toMatch(/"(metadata|barcode|ean|upc|hs_code|mid_code)"/)
          expect(body).not.toContain("cost")
        }
      })

      it("exposes nothing private", async () => {
        const container = getContainer()
        const { result: categories } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              { name: "Interna", handle: "interna", is_active: true, is_internal: true },
            ],
          },
        })
        await createProduct("publico", {
          product: {
            category_ids: [categories[0]?.id],
            metadata: { fabric: "Tecido de exemplo", cost: 12.5, supplier: "Fornecedor" },
          },
        })
        await createProduct("rascunho", { product: { status: "draft" } })
        await createProduct("sem-canal", { product: { sales_channels: [] } })

        const { products, count } = await list()

        expect(count).toBe(1)
        expect(products.map((product) => product.handle)).toEqual(["publico"])
        const [product] = products
        expect(product?.metadata).toEqual({ fabric: "Tecido de exemplo" })
        expect(product?.categories).toEqual([])
        expect(Object.keys(product ?? {}).sort()).toEqual([
          "categories",
          "collection",
          "description",
          "handle",
          "id",
          "images",
          "metadata",
          "options",
          "subtitle",
          "thumbnail",
          "title",
          "variants",
        ])
        expect(await handles({ category_handle: "interna" })).toEqual([])
        const draft = await get("/store/catalog/products/rascunho")
        expect(draft.status).toBe(404)
      })
    })
  },
})
