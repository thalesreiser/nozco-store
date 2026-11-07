import type { StoreAddress } from "@nozco/shared-types"
import { beforeEach, describe, expect, it } from "vitest"
import { resetDataSources } from "~/data"
import { productFixtures } from "~/data/mock/fixtures"

const ALFA = "camiseta-ficticia-alfa"
const LAST_UNIT = `variant_mock_${ALFA}_P_Preto`
const IN_STOCK = `variant_mock_${ALFA}_M_Preto`
const NO_STOCK = `variant_mock_${ALFA}_G_Branco`

const address: StoreAddress = {
  first_name: "Pessoa",
  last_name: "Fictícia",
  address_1: "Rua de Exemplo, 100",
  address_2: null,
  city: "Cidade Exemplo",
  province: "SP",
  postal_code: "00000000",
  country_code: "br",
  phone: null,
}

beforeEach(() => {
  useRuntimeConfig().public.dataSource = "mock"
  resetDataSources()
})

describe("fixtures", () => {
  it("are apparel with integer cents, per-variant stock and per-colour images", () => {
    for (const product of productFixtures) {
      expect(product.options.map((option) => option.title)).toEqual(["Tamanho", "Cor"])
      for (const variant of product.variants) {
        expect(Number.isInteger(variant.calculated_price.calculated_amount)).toBe(true)
        expect(Number.isInteger(variant.inventory_quantity)).toBe(true)
        expect(variant.options).toHaveLength(2)
        expect(variant.images.length).toBeGreaterThan(0)
      }
    }
  })
})

describe("useProducts on the mock source", () => {
  it("lists with the count of all matches and applies the page", async () => {
    const page = await useProducts().listProducts({ limit: 2, offset: 1 })

    expect(page).toMatchObject({ count: productFixtures.length, limit: 2, offset: 1 })
    expect(page.products).toHaveLength(2)
  })

  it.each([
    [{ q: "moletom" }, ["moletom-ficticio-gama"]],
    [{ category_handle: "moletons-exemplo" }, ["moletom-ficticio-gama"]],
    [{ option_values: { Cor: ["Branco"] } }, [ALFA]],
    [
      // Gama has this size and colour, but sold out.
      { option_values: { Cor: ["Cinza"], Tamanho: ["M"] } },
      ["camiseta-ficticia-beta"],
    ],
    [{ option_values: { Cor: ["Branco"], Tamanho: ["XX"] } }, []],
    [{ min_price: 5000, max_price: 6000 }, ["camiseta-ficticia-beta"]],
    [{ collection_handle: "nada" }, []],
  ])("filters by %j", async (query, handles) => {
    const { products } = await useProducts().listProducts(query)

    expect(products.map((product) => product.handle)).toEqual(handles)
  })

  it("sorts by price in both directions", async () => {
    const { listProducts } = useProducts()
    const ascending = (await listProducts({ order: "price_asc", limit: 100 })).products.map(
      (p) => p.handle,
    )
    const descending = (await listProducts({ order: "price_desc", limit: 100 })).products.map(
      (p) => p.handle,
    )

    expect(ascending[0]).toBe(ALFA)
    expect(descending).toEqual([...ascending].reverse())
  })

  it("returns a product with compare-at price and a gallery per colour", async () => {
    const product = await useProducts().getProduct(ALFA)
    const imagesOf = (color: string) =>
      product?.variants.find((variant) => variant.title.endsWith(color))?.images[0]?.url

    expect(product?.variants[0]?.calculated_price).toEqual({
      calculated_amount: 4990,
      compare_at_amount: 6990,
      currency_code: "brl",
    })
    expect(imagesOf("Preto")).toBeDefined()
    expect(imagesOf("Preto")).not.toBe(imagesOf("Branco"))
  })

  it("returns null for an unknown handle", async () => {
    await expect(useProducts().getProduct("nao-existe")).resolves.toBeNull()
  })

  it("hands out copies, so a caller cannot change the catalog", async () => {
    const product = await useProducts().getProduct(ALFA)
    product!.title = "changed"

    expect((await useProducts().getProduct(ALFA))?.title).not.toBe("changed")
  })
})

describe("useCart on the mock source", () => {
  it("has no cart until the first item", async () => {
    await expect(useCart().getCart()).resolves.toBeNull()
  })

  it("adds, merges, updates and removes with totals in cents", async () => {
    const { addItem, updateItem, removeItem, getCart } = useCart()

    const added = await addItem({ variant_id: IN_STOCK, quantity: 1 })
    expect(added.total).toBe(4990)

    const merged = await addItem({ variant_id: IN_STOCK, quantity: 1 })
    expect(merged.items).toHaveLength(1)
    expect(merged.items[0]).toMatchObject({ quantity: 2, total: 9980, compare_at_unit_price: 6990 })
    expect(merged.id).toBe(added.id)

    const lineId = merged.items[0]!.id
    expect((await updateItem(lineId, { quantity: 3 })).item_subtotal).toBe(14970)

    expect((await removeItem(lineId)).items).toEqual([])
    expect((await getCart())?.total).toBe(0)
  })

  it.each([
    ["a variant with no stock", NO_STOCK, 1],
    ["more than the stock", LAST_UNIT, 2],
  ])("refuses %s", async (_case, variant_id, quantity) => {
    await expect(useCart().addItem({ variant_id, quantity })).rejects.toMatchObject({
      name: "DataSourceError",
      code: "insufficient_stock",
    })
  })

  it("counts what the cart already holds against the stock", async () => {
    const { addItem } = useCart()
    await addItem({ variant_id: LAST_UNIT, quantity: 1 })

    await expect(addItem({ variant_id: LAST_UNIT, quantity: 1 })).rejects.toMatchObject({
      code: "insufficient_stock",
    })
  })

  it("rejects unknown variants and line items as not_found", async () => {
    const { addItem, removeItem } = useCart()

    await expect(addItem({ variant_id: "nope", quantity: 1 })).rejects.toMatchObject({
      code: "not_found",
    })
    await expect(removeItem("nope")).rejects.toMatchObject({ code: "not_found" })
  })
})

describe("useCheckout on the mock source", () => {
  it("needs a cart", async () => {
    await expect(
      useCheckout().setContact({ email: "a@example.com", shipping_address: address }),
    ).rejects.toMatchObject({ code: "not_found" })
  })

  it("goes from contact to a paid order", async () => {
    await useCart().addItem({ variant_id: IN_STOCK, quantity: 1 })
    const checkout = useCheckout()

    const withContact = await checkout.setContact({
      email: "pessoa@example.com",
      shipping_address: address,
    })
    expect(withContact.billing_address).toEqual(address)

    const [option] = await checkout.listShippingOptions()
    const withShipping = await checkout.selectShippingOption(option!.id)
    expect(withShipping.shipping_total).toBe(option!.amount)
    expect(withShipping.total).toBe(4990 + option!.amount)

    const [provider] = await checkout.listPaymentProviders()
    const session = await checkout.startPayment({ provider_id: provider!.id })
    expect(session).toMatchObject({ status: "pending", amount: withShipping.total })

    await expect(checkout.getPaymentStatus()).resolves.toEqual({ status: "pending" })
    await expect(checkout.getPaymentStatus()).resolves.toMatchObject({ status: "paid" })
  })

  it("rejects unknown shipping options and payment providers", async () => {
    await useCart().addItem({ variant_id: IN_STOCK, quantity: 1 })
    const { selectShippingOption, startPayment } = useCheckout()

    await expect(selectShippingOption("nope")).rejects.toMatchObject({ code: "not_found" })
    await expect(startPayment({ provider_id: "nope" })).rejects.toMatchObject({
      code: "not_found",
    })
  })
})
