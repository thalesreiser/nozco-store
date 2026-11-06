import { Modules } from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createPriceListsWorkflow,
  createProductCategoriesWorkflow,
  createProductTypesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { buildSalePriceList } from "../../src/lib/apparel/sale"
import { queryList } from "../../src/lib/store-setup/query"
import { setupStore, type StoreSetupResult } from "../../src/lib/store-setup/setup-store"
import { createApparelProduct } from "../../src/workflows/create-apparel-product"

jest.setTimeout(120 * 1000)

// Example only: the real garment types, size grid and fabric are pending in Q-03.
const EXAMPLE_SIZES = ["Tam-1", "Tam-2"]
const EXAMPLE_COLORS = ["Preto", "Cinza Mescla"]
const EXAMPLE_TYPE = "Tipo de exemplo"
const REGULAR_PRICE = 129.9
const SALE_PRICE = 89.9

type StoreVariant = {
  id: string
  sku: string
  title: string
  inventory_quantity: number
  manage_inventory: boolean
  allow_backorder: boolean
  options: { value: string }[]
  calculated_price: {
    calculated_amount: number
    original_amount: number
    currency_code: string
  }
}

type StoreProductRow = {
  id: string
  handle: string
  metadata: Record<string, unknown> | null
  type: { value: string } | null
  collection: { handle: string; title: string } | null
  categories: { handle: string; name: string }[]
  options: { title: string; values: { value: string }[] }[]
  variants: StoreVariant[]
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("apparel product model (BE-02.1)", () => {
      let setup: StoreSetupResult
      let headers: Record<string, string>

      const createExample = (handle: string, skuPrefix: string, metadata = {}) =>
        createApparelProduct(getContainer(), {
          skuPrefix,
          sizes: EXAMPLE_SIZES,
          colors: EXAMPLE_COLORS,
          price: REGULAR_PRICE,
          stock: [{ size: "Tam-1", color: "Preto", quantity: 7 }],
          stockLocationId: setup.stockLocationId,
          product: {
            title: "Camiseta de exemplo",
            handle,
            status: "published",
            sales_channels: [{ id: setup.salesChannelId }],
            metadata,
          },
        })

      const listProducts = async (params: Record<string, string> = {}) => {
        const response = (await api.get("/store/products", {
          headers,
          params: {
            region_id: setup.regionId,
            fields:
              "+metadata,*categories,*variants.calculated_price,+variants.inventory_quantity," +
              "+variants.manage_inventory,+variants.allow_backorder",
            ...params,
          },
        })) as { data: { products: StoreProductRow[] } }
        return response.data.products
      }

      const productCount = async (handle: string) =>
        (
          await queryList(getContainer(), {
            entity: "product",
            fields: ["id"],
            filters: { handle },
          })
        ).length

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

      it("creates one variant and SKU per combination, returned by the Store API", async () => {
        await createExample("exemplo-grade", "EXEMPLO")

        const [product] = await listProducts({ handle: "exemplo-grade" })

        expect(product?.options.map((option) => option.title).sort()).toEqual(["Cor", "Tamanho"])
        expect(product?.variants.map((variant) => variant.sku).sort()).toEqual([
          "EXEMPLO-CINZA-MESCLA-TAM-1",
          "EXEMPLO-CINZA-MESCLA-TAM-2",
          "EXEMPLO-PRETO-TAM-1",
          "EXEMPLO-PRETO-TAM-2",
        ])
        const combinations = product?.variants.map((variant) =>
          variant.options
            .map((option) => option.value)
            .sort()
            .join("|"),
        )
        expect(new Set(combinations).size).toBe(EXAMPLE_SIZES.length * EXAMPLE_COLORS.length)
      })

      it("tracks stock per variant at the location and reports a variant with no stock", async () => {
        await createExample("exemplo-estoque", "ESTOQUE")

        const [product] = await listProducts({ handle: "exemplo-estoque" })
        const bySku = new Map(product?.variants.map((variant) => [variant.sku, variant]))

        expect(bySku.get("ESTOQUE-PRETO-TAM-1")?.inventory_quantity).toBe(7)
        expect(bySku.get("ESTOQUE-PRETO-TAM-2")).toEqual(
          expect.objectContaining({
            inventory_quantity: 0,
            manage_inventory: true,
            allow_backorder: false,
          }),
        )

        const levels = await getContainer()
          .resolve(Modules.INVENTORY)
          .listInventoryLevels({ location_id: setup.stockLocationId })
        expect(levels).toHaveLength(4)
      })

      it("returns the compare-at price of a price list, in major units", async () => {
        const container = getContainer()
        await createExample("exemplo-promo", "PROMO")
        const [created] = await listProducts({ handle: "exemplo-promo" })
        const onSale = created?.variants.find((variant) => variant.sku === "PROMO-PRETO-TAM-1")

        await createPriceListsWorkflow(container).run({
          input: {
            price_lists_data: [
              buildSalePriceList({
                title: "Promoção de exemplo",
                description: "Exemplo",
                prices: [
                  {
                    variantId: onSale?.id ?? "",
                    regularAmount: REGULAR_PRICE,
                    saleAmount: SALE_PRICE,
                  },
                ],
              }),
            ],
          },
        })

        const [product] = await listProducts({ handle: "exemplo-promo" })
        const priceOf = (sku: string) =>
          product?.variants.find((variant) => variant.sku === sku)?.calculated_price

        expect(priceOf("PROMO-PRETO-TAM-1")).toEqual(
          expect.objectContaining({
            calculated_amount: SALE_PRICE,
            original_amount: REGULAR_PRICE,
            currency_code: "brl",
          }),
        )
        expect(priceOf("PROMO-PRETO-TAM-2")).toEqual(
          expect.objectContaining({
            calculated_amount: REGULAR_PRICE,
            original_amount: REGULAR_PRICE,
          }),
        )
      })

      it("uses Medusa's types, categories and collections, as data", async () => {
        const container = getContainer()
        const { result: types } = await createProductTypesWorkflow(container).run({
          input: { product_types: [{ value: EXAMPLE_TYPE }] },
        })
        const { result: categories } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              { name: "Categoria de exemplo", handle: "cat-exemplo", is_active: true },
            ],
          },
        })
        const { result: collections } = await createCollectionsWorkflow(container).run({
          input: { collections: [{ title: "Coleção de exemplo", handle: "col-exemplo" }] },
        })
        const { productId } = await createApparelProduct(container, {
          skuPrefix: "TAXON",
          sizes: EXAMPLE_SIZES,
          colors: EXAMPLE_COLORS,
          price: REGULAR_PRICE,
          stockLocationId: setup.stockLocationId,
          product: {
            title: "Camiseta de exemplo",
            handle: "exemplo-taxon",
            status: "published",
            sales_channels: [{ id: setup.salesChannelId }],
            type_id: types[0]?.id,
            category_ids: [categories[0]?.id ?? ""],
            collection_id: collections[0]?.id,
          },
        })
        await createExample("exemplo-fora", "FORA")

        const inCategory = await listProducts({ category_id: categories[0]?.id ?? "" })
        const inCollection = await listProducts({ collection_id: collections[0]?.id ?? "" })

        expect(inCategory.map((product) => product.id)).toEqual([productId])
        expect(inCollection.map((product) => product.id)).toEqual([productId])
        expect(inCategory[0]).toEqual(
          expect.objectContaining({
            type: expect.objectContaining({ value: EXAMPLE_TYPE }),
            categories: [expect.objectContaining({ handle: "cat-exemplo" })],
            collection: expect.objectContaining({
              handle: "col-exemplo",
              title: "Coleção de exemplo",
            }),
          }),
        )
      })

      // Medusa rejects with a serialized error, a plain object that rejects.toThrow does not recognise.
      it("returns the garment metadata and rejects an invalid one, undoing the work", async () => {
        const metadata = { fabric: "Tecido de exemplo", care: "Exemplo", weight_g: 180 }
        const { productId } = await createExample("exemplo-meta", "META", metadata)

        const [product] = await listProducts({ handle: "exemplo-meta" })
        expect(product?.metadata).toEqual(metadata)

        await expect(
          createExample("exemplo-invalido", "INVALIDO", { weight_g: "x" }),
        ).rejects.toMatchObject({ message: "Invalid product metadata: weight_g" })
        expect(await productCount("exemplo-invalido")).toBe(0)

        await expect(
          updateProductsWorkflow(getContainer()).run({
            input: { products: [{ id: productId, metadata: { length_cm: -1 } }] },
          }),
        ).rejects.toMatchObject({ message: "Invalid product metadata: length_cm" })
        const [unchanged] = await listProducts({ handle: "exemplo-meta" })
        expect(unchanged?.metadata).toEqual(metadata)
      })

      it("refuses a SKU already in use by another product, leaving nothing behind", async () => {
        await createExample("exemplo-primeiro", "REPETIDO")

        await expect(createExample("exemplo-segundo", "REPETIDO")).rejects.toMatchObject({
          message: expect.stringMatching(/sku/i),
        })

        expect(await productCount("exemplo-segundo")).toBe(0)
      })
    })
  },
})
