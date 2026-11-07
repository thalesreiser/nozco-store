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

const insufficientStock = {
  status: 409,
  data: { code: "insufficient_stock", message: "The requested quantity is not in stock." },
}

// Exactly { code, message }: Medusa's `type` is not part of the answer.
const expectAnswer = (answer: Answer, expected: { status: number; data: object }) => {
  expect(answer.status).toBe(expected.status)
  expect(answer.data).toEqual(expected.data)
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

      const inventoryItemId = async (variantId: string) => {
        const [variant] = await queryList<{ inventory_items: { inventory_item_id: string }[] }>(
          getContainer(),
          {
            entity: "product_variant",
            fields: ["inventory_items.inventory_item_id"],
            filters: { id: variantId },
          },
        )
        return variant?.inventory_items[0]?.inventory_item_id ?? ""
      }

      const setStock = async (variantId: string, stocked_quantity: number) => {
        await getContainer()
          .resolve(Modules.INVENTORY)
          .updateInventoryLevels([
            {
              inventory_item_id: await inventoryItemId(variantId),
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

      it("rejects adding a variant with no stock", async () => {
        expectAnswer(await addLine({ variant_id: noStock, quantity: 1 }), insufficientStock)
        expect(await lines()).toEqual([])
      })

      it("rejects adding more than the stock, and keeps a line within it", async () => {
        expectAnswer(await addLine({ variant_id: inStock, quantity: STOCK + 1 }), insufficientStock)
        expect(await lines()).toEqual([])

        expect((await addLine({ variant_id: inStock, quantity: STOCK })).status).toBe(200)
        expect((await lines())[0]?.quantity).toBe(STOCK)
      })

      it("counts the quantity already in the line when the same variant is added again", async () => {
        await addLine({ variant_id: inStock, quantity: 3 })

        expectAnswer(await addLine({ variant_id: inStock, quantity: 3 }), insufficientStock)
        expect((await lines()).map((line) => line.quantity)).toEqual([3])

        expect((await addLine({ variant_id: inStock, quantity: 2 })).status).toBe(200)
        expect((await lines()).map((line) => line.quantity)).toEqual([STOCK])
      })

      it("rejects updating a line above the stock, leaving the line as it was", async () => {
        await addLine({ variant_id: inStock, quantity: 2 })
        const [line] = await lines()

        expectAnswer(await updateLine(line?.id ?? "", STOCK + 1), insufficientStock)
        expect((await lines())[0]?.quantity).toBe(2)

        expect((await updateLine(line?.id ?? "", STOCK)).status).toBe(200)
      })

      it("counts stock that is already reserved", async () => {
        await getContainer()
          .resolve(Modules.INVENTORY)
          .createReservationItems([
            {
              inventory_item_id: await inventoryItemId(inStock),
              location_id: setup.stockLocationId,
              quantity: STOCK - 1,
            },
          ])

        expectAnswer(await addLine({ variant_id: inStock, quantity: 2 }), insufficientStock)
        expect((await addLine({ variant_id: inStock, quantity: 1 })).status).toBe(200)
      })

      // Pending decision: this records today's behaviour, the most reversible one, not a chosen rule.
      it("leaves a line untouched when the stock falls, and only checks later changes", async () => {
        await addLine({ variant_id: inStock, quantity: 4 })
        const [line] = await lines()
        const lineId = line?.id ?? ""

        await setStock(inStock, 2)

        expect((await lines())[0]?.quantity).toBe(4)
        // Lowering the quantity is refused too while it stays above the new stock.
        expectAnswer(await updateLine(lineId, 3), insufficientStock)
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

      it("does not block another variant when one line is above the stock", async () => {
        await addLine({ variant_id: inStock, quantity: 4 })
        await setStock(inStock, 2)
        await setStock(noStock, 1)

        expect((await addLine({ variant_id: noStock, quantity: 1 })).status).toBe(200)
      })

      // Medusa alone answered 200 to these three (CI run 42328587124 of this branch).
      describe("a variant in more than one line, which Medusa checks one line at a time", () => {
        const other = { exemplo: "outra linha" }

        it("adds the lines up when adding", async () => {
          await addLine({ variant_id: inStock, quantity: 3 })

          expectAnswer(
            await addLine({ variant_id: inStock, quantity: 3, metadata: other }),
            insufficientStock,
          )
          expect((await lines()).map((line) => line.quantity)).toEqual([3])

          const within = await addLine({ variant_id: inStock, quantity: 2, metadata: other })
          expect(within.status).toBe(200)
          expect((await lines()).map((line) => line.quantity).sort()).toEqual([2, 3])
        })

        it("adds the lines up when updating, and still allows removing one", async () => {
          await addLine({ variant_id: inStock, quantity: 3 })
          await addLine({ variant_id: inStock, quantity: 2, metadata: other })
          const current = await lines()
          const smaller = current.find((line) => line.quantity === 2)?.id ?? ""
          const larger = current.find((line) => line.quantity === 3)?.id ?? ""

          expectAnswer(await updateLine(smaller, 3), insufficientStock)
          expect((await updateLine(smaller, 1)).status).toBe(200)

          expect((await updateLine(larger, 0)).status).toBe(200)
          expect((await lines()).map((line) => line.quantity)).toEqual([1])
        })

        it("adds repeated items up when a cart is created with them", async () => {
          const carts = getContainer().resolve(Modules.CART)
          const before = await carts.listCarts({})

          expectAnswer(
            await post("/store/carts", {
              region_id: setup.regionId,
              items: [
                { variant_id: inStock, quantity: 3 },
                { variant_id: inStock, quantity: 3 },
              ],
            }),
            insufficientStock,
          )

          expect(await carts.listCarts({})).toHaveLength(before.length)
        })
      })

      describe("quantities that are not whole numbers", () => {
        const expectInvalidQuantity = (answer: Answer) => {
          expect(answer.status).toBe(400)
          expect(answer.data).toEqual({ code: "invalid_quantity", message: expect.any(String) })
        }

        it.each([1.5, 0.5, -1.5])("rejects %d when adding a line", async (quantity) => {
          expectInvalidQuantity(await addLine({ variant_id: inStock, quantity }))
          expect(await lines()).toEqual([])
        })

        it.each([1.5, 0.5, -1.5])("rejects %d when updating a line", async (quantity) => {
          await addLine({ variant_id: inStock, quantity: 2 })
          const [line] = await lines()

          expectInvalidQuantity(await updateLine(line?.id ?? "", quantity))
          expect((await lines())[0]?.quantity).toBe(2)
        })

        it.each([1.5, 0.5, -1.5])("rejects %d when creating a cart", async (quantity) => {
          const carts = getContainer().resolve(Modules.CART)
          const before = await carts.listCarts({})

          expectInvalidQuantity(
            await post("/store/carts", {
              region_id: setup.regionId,
              items: [{ variant_id: inStock, quantity }],
            }),
          )
          expect(await carts.listCarts({})).toHaveLength(before.length)
        })

        it("still accepts whole numbers on all three routes", async () => {
          const created = await post("/store/carts", {
            region_id: setup.regionId,
            items: [{ variant_id: inStock, quantity: 1 }],
          })
          expect(created.status).toBe(200)
          expect(created.data.cart?.items.map((line) => line.quantity)).toEqual([1])

          expect((await addLine({ variant_id: inStock, quantity: 2 })).status).toBe(200)
          const [line] = await lines()
          expect(line?.quantity).toBe(2)

          expect((await updateLine(line?.id ?? "", 3)).status).toBe(200)
          expect((await lines())[0]?.quantity).toBe(3)
        })

        it("leaves a quantity that is not a number to Medusa", async () => {
          const answer = await post(`/store/carts/${cartId}/line-items`, {
            variant_id: inStock,
            quantity: "1.5",
          })

          expect(answer.status).toBe(400)
          expect(answer.data.code).toBe("invalid_request")
        })
      })

      describe("the other failures of a cart route", () => {
        it("answers with the codes the storefront uses", async () => {
          expectAnswer(await addLine({ variant_id: "variant_inexistente", quantity: 1 }), {
            status: 404,
            data: { code: "not_found", message: "The variant is not on sale." },
          })
          expectAnswer(
            await post("/store/carts/cart_inexistente/line-items", {
              variant_id: inStock,
              quantity: 1,
            }),
            { status: 404, data: { code: "cart_not_found", message: "The cart does not exist." } },
          )

          const noLine = await updateLine("cali_inexistente", 1)
          expect(noLine.status).toBe(404)
          expect(noLine.data).toEqual({ code: "not_found", message: expect.any(String) })

          const invalid = await addLine({ variant_id: inStock, quantity: -1 })
          expect(invalid.status).toBe(400)
          expect(invalid.data).toEqual({ code: "invalid_request", message: expect.any(String) })
        })

        it("refuses to change a completed cart", async () => {
          await getContainer()
            .resolve(Modules.CART)
            .updateCarts(cartId, { completed_at: new Date() })

          expectAnswer(await addLine({ variant_id: inStock, quantity: 1 }), {
            status: 409,
            data: { code: "cart_completed", message: "The cart is already completed." },
          })
        })

        it("leaves other routes with Medusa's own answer", async () => {
          const answer = (await api.get("/store/products/prod_inexistente", options())) as Answer

          expect(answer.status).toBe(404)
          expect(answer.data.type).toBe("not_found")
        })
      })
    })
  },
})
