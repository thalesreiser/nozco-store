import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { queryList } from "../../src/lib/store-setup/query"
import { setupStore, type StoreSetupResult } from "../../src/lib/store-setup/setup-store"
import { createApparelProduct } from "../../src/workflows/create-apparel-product"

jest.setTimeout(120 * 1000)

const STOCK = 5
const SIZES = ["Tam-1", "Tam-2"]
const COLORS = ["Preto"]

type Line = { id: string; variant_id: string; quantity: number }
type Answer = {
  status: number
  data: { code?: string; type?: string; message?: string; cart?: { id: string; items: Line[] } }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("cart stock rules (BE-04.1)", () => {
      let setup: StoreSetupResult
      let headers: Record<string, string>
      let inStock: string
      let noStock: string
      let cartId: string

      const options = () => ({ headers, validateStatus: () => true })
      const post = (path: string, body: unknown) =>
        api.post(path, body, options()) as Promise<Answer>
      const addLine = (body: { variant_id: string; quantity: number; metadata?: object }) =>
        post(`/store/carts/${cartId}/line-items`, body)
      const updateLine = (lineId: string, quantity: number) =>
        post(`/store/carts/${cartId}/line-items/${lineId}`, { quantity })

      const lines = async () => {
        const answer = (await api.get(`/store/carts/${cartId}`, options())) as Answer
        return answer.data.cart?.items ?? []
      }

      const setStock = async (variantId: string, stocked_quantity: number) => {
        const [variant] = await queryList<{ inventory_items: { inventory_item_id: string }[] }>(
          getContainer(),
          {
            entity: "product_variant",
            fields: ["inventory_items.inventory_item_id"],
            filters: { id: variantId },
          },
        )
        await getContainer()
          .resolve(Modules.INVENTORY)
          .updateInventoryLevels([
            {
              inventory_item_id: variant?.inventory_items[0]?.inventory_item_id ?? "",
              location_id: setup.stockLocationId,
              stocked_quantity,
            },
          ])
      }

      beforeEach(async () => {
        const container = getContainer()
        setup = await setupStore(container)
        const [key] = await queryList<{ token: string }>(container, {
          entity: "api_key",
          fields: ["token"],
          filters: { id: setup.publishableApiKeyId },
        })
        headers = { "x-publishable-api-key": key?.token ?? "" }

        const { productId } = await createApparelProduct(container, {
          skuPrefix: "CARRINHO",
          sizes: SIZES,
          colors: COLORS,
          price: 129.9,
          stock: [{ size: "Tam-1", color: "Preto", quantity: STOCK }],
          stockLocationId: setup.stockLocationId,
          product: {
            title: "Camiseta de exemplo",
            handle: "exemplo-carrinho",
            status: "published",
            sales_channels: [{ id: setup.salesChannelId }],
          },
        })
        const variants = await queryList<{ id: string; sku: string }>(container, {
          entity: "product_variant",
          fields: ["id", "sku"],
          filters: { product_id: productId },
        })
        inStock = variants.find((variant) => variant.sku === "CARRINHO-PRETO-TAM-1")?.id ?? ""
        noStock = variants.find((variant) => variant.sku === "CARRINHO-PRETO-TAM-2")?.id ?? ""

        const created = await post("/store/carts", { region_id: setup.regionId })
        cartId = created.data.cart?.id ?? ""
      })

      describe("what Medusa does on its own", () => {
        it("rejects adding a variant with no stock", async () => {
          const answer = await addLine({ variant_id: noStock, quantity: 1 })

          console.info("add no stock", answer.status, JSON.stringify(answer.data))
          expect(answer.status).toBe(400)
          expect(answer.data.code).toBe("insufficient_inventory")
          expect(await lines()).toEqual([])
        })

        it("rejects adding more than the stock, and keeps a line within it", async () => {
          expect((await addLine({ variant_id: inStock, quantity: STOCK + 1 })).status).toBe(400)
          expect(await lines()).toEqual([])

          expect((await addLine({ variant_id: inStock, quantity: STOCK })).status).toBe(200)
          expect((await lines())[0]?.quantity).toBe(STOCK)
        })

        it("counts the quantity already in the line when the same variant is added again", async () => {
          await addLine({ variant_id: inStock, quantity: 3 })

          expect((await addLine({ variant_id: inStock, quantity: 3 })).status).toBe(400)
          expect((await lines()).map((line) => line.quantity)).toEqual([3])

          expect((await addLine({ variant_id: inStock, quantity: 2 })).status).toBe(200)
          expect((await lines()).map((line) => line.quantity)).toEqual([STOCK])
        })

        it("rejects updating a line above the stock, leaving the line as it was", async () => {
          await addLine({ variant_id: inStock, quantity: 2 })
          const [line] = await lines()

          const answer = await updateLine(line?.id ?? "", STOCK + 1)

          console.info("update above stock", answer.status, JSON.stringify(answer.data))
          expect(answer.status).toBe(400)
          expect((await lines())[0]?.quantity).toBe(2)
          expect((await updateLine(line?.id ?? "", STOCK)).status).toBe(200)
        })

        it("leaves a line untouched when the stock falls, and only checks later changes", async () => {
          await addLine({ variant_id: inStock, quantity: 4 })
          const [line] = await lines()
          const lineId = line?.id ?? ""

          await setStock(inStock, 2)

          expect((await lines())[0]?.quantity).toBe(4)
          // Lowering the quantity is refused too while it stays above the new stock.
          expect((await updateLine(lineId, 3)).status).toBe(400)
          expect((await lines())[0]?.quantity).toBe(4)
          expect((await updateLine(lineId, 2)).status).toBe(200)
          expect((await lines())[0]?.quantity).toBe(2)

          await setStock(inStock, 0)
          expect((await lines())[0]?.quantity).toBe(2)
          const removed = (await api.delete(
            `/store/carts/${cartId}/line-items/${lineId}`,
            options(),
          )) as { status: number }
          expect(removed.status).toBe(200)
          expect(await lines()).toEqual([])
        })

        it("does not add up two lines of one variant that differ in metadata", async () => {
          expect((await addLine({ variant_id: inStock, quantity: 3 })).status).toBe(200)

          const answer = await addLine({
            variant_id: inStock,
            quantity: 3,
            metadata: { exemplo: "outra linha" },
          })

          console.info("split lines", answer.status, JSON.stringify(answer.data))
          expect(answer.status).toBe(200)
          expect((await lines()).map((line) => line.quantity).sort()).toEqual([3, 3])
        })

        it("does not add up repeated items when a cart is created with them", async () => {
          const answer = await post("/store/carts", {
            region_id: setup.regionId,
            items: [
              { variant_id: inStock, quantity: 3 },
              { variant_id: inStock, quantity: 3 },
            ],
          })

          console.info(
            "create with repeated items",
            answer.status,
            JSON.stringify(answer.data.cart?.items ?? answer.data),
          )
          expect(answer.status).toBe(200)
        })

        it("reports the other failures of a cart route", async () => {
          const missing = await addLine({ variant_id: "variant_inexistente", quantity: 1 })
          const noLine = await updateLine("cali_inexistente", 1)
          const noCart = await post("/store/carts/cart_inexistente/line-items", {
            variant_id: inStock,
            quantity: 1,
          })
          await getContainer()
            .resolve(Modules.CART)
            .updateCarts(cartId, { completed_at: new Date() })
          const completed = await addLine({ variant_id: inStock, quantity: 1 })

          for (const [name, answer] of Object.entries({ missing, noLine, noCart, completed })) {
            console.info(name, answer.status, JSON.stringify(answer.data))
          }
          expect(noCart.status).toBe(404)
        })
      })
    })
  },
})
