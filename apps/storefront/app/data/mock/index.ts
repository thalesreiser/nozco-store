import type {
  StoreCart,
  StoreCartLineItem,
  StoreProduct,
  StoreProductFacet,
  StoreProductListQuery,
} from "@nozco/shared-types"
import { OPTION_TITLES } from "~/lib/catalog-contract"
import { DataSourceError } from "../errors"
import type { DataSource, StoreProductFiltersQuery } from "../source"
import {
  homeContentFixture,
  paymentProviderFixtures,
  productFixtures,
  shippingOptionFixtures,
} from "./fixtures"

const lowestPrice = (product: StoreProduct) =>
  Math.min(...product.variants.map((variant) => variant.calculated_price.calculated_amount))

const isOnSale = (product: StoreProduct) =>
  product.variants.some((variant) => variant.calculated_price.compare_at_amount !== null)

/** The fixtures have no sales or dates, so `best_selling` and `newest` keep their order. */
function sortByQuery(products: StoreProduct[], order: StoreProductListQuery["order"]) {
  if (order === "price_asc") products.sort((a, b) => lowestPrice(a) - lowestPrice(b))
  if (order === "price_desc") products.sort((a, b) => lowestPrice(b) - lowestPrice(a))
  if (order === "on_sale") products.sort((a, b) => Number(isOnSale(b)) - Number(isOnSale(a)))
}

const inStock = (product: StoreProduct) =>
  product.variants.filter((variant) => variant.inventory_quantity > 0)

/** Size and colour filters match only variants in stock (ADR 011). No filter keeps every variant. */
function variantsMatching(product: StoreProduct, wanted: Record<string, string[]>) {
  const titles = new Map(product.options.map((option) => [option.id, option.title]))
  const entries = Object.entries(wanted)
  if (entries.length === 0) return product.variants
  return inStock(product).filter((variant) =>
    entries.every(([title, values]) =>
      variant.options.some(
        (value) => titles.get(value.option_id) === title && values.includes(value.value),
      ),
    ),
  )
}

function matchesPrice(product: StoreProduct, query: StoreProductFiltersQuery) {
  const price = lowestPrice(product)
  return (
    (query.min_price === undefined || price >= query.min_price) &&
    (query.max_price === undefined || price <= query.max_price)
  )
}

function matchesBase(product: StoreProduct, query: StoreProductFiltersQuery) {
  return (
    (!query.q || product.title.toLowerCase().includes(query.q.toLowerCase())) &&
    (!query.category_handle ||
      product.categories.some((category) => category.handle === query.category_handle)) &&
    (!query.collection_handle || product.collection?.handle === query.collection_handle)
  )
}

function matchesQuery(product: StoreProduct, query: StoreProductFiltersQuery) {
  return (
    matchesBase(product, query) &&
    matchesPrice(product, query) &&
    variantsMatching(product, query.option_values ?? {}).length > 0
  )
}

/** Same rules as `buildFacets` in the backend: each option is counted with the others' filters only. */
function facetFor(
  products: StoreProduct[],
  title: string,
  wanted: Record<string, string[]>,
): StoreProductFacet {
  const { [title]: _ignored, ...others } = wanted
  const counts = new Map<string, number>()
  for (const product of products) {
    const optionId = product.options.find((option) => option.title === title)?.id
    // Picking a value offered here must find something, so a facet counts in-stock variants only.
    const matching = Object.keys(others).length
      ? variantsMatching(product, others)
      : inStock(product)
    const values = matching.flatMap((variant) =>
      variant.options.filter((value) => value.option_id === optionId).map((value) => value.value),
    )
    for (const value of new Set(values)) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return {
    title,
    values: [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true })),
  }
}

function findVariant(variantId: string) {
  for (const product of productFixtures) {
    const variant = product.variants.find((candidate) => candidate.id === variantId)
    if (variant) return { product, variant }
  }
  throw new DataSourceError("not_found", `No variant "${variantId}" in the mock catalog.`)
}

function assertInStock(variantId: string, quantity: number) {
  const { variant } = findVariant(variantId)
  if (quantity > variant.inventory_quantity) {
    throw new DataSourceError(
      "insufficient_stock",
      `Variant "${variantId}" has ${variant.inventory_quantity} units, asked for ${quantity}.`,
    )
  }
}

/** In-memory source over the fixtures. State lives in the instance, one per Nuxt app (see ../index). */
export function createMockSource(): DataSource {
  let cart: StoreCart | null = null
  let nextId = 1
  let paymentPolls = 0

  const requireCart = () => {
    if (!cart) throw new DataSourceError("not_found", "The mock source has no current cart.")
    return cart
  }

  /** Recomputes the totals and hands out a copy, so callers cannot change the stored cart. */
  const saved = (next: StoreCart): StoreCart => {
    const item_subtotal = next.items.reduce((sum, item) => sum + item.total, 0)
    const shipping_total = next.shipping_methods.reduce((sum, method) => sum + method.amount, 0)
    cart = {
      ...next,
      item_subtotal,
      shipping_total,
      total: item_subtotal + shipping_total - next.discount_total,
    }
    return structuredClone(cart)
  }

  const withQuantity = (item: StoreCartLineItem, quantity: number): StoreCartLineItem => ({
    ...item,
    quantity,
    total: item.unit_price * quantity,
  })

  const newLine = (cartId: string, variantId: string, quantity: number): StoreCartLineItem => {
    const { product, variant } = findVariant(variantId)
    return withQuantity(
      {
        id: `item_mock_${nextId++}`,
        cart_id: cartId,
        title: product.title,
        thumbnail: variant.images[0]?.url ?? product.thumbnail,
        quantity,
        product_id: product.id,
        product_handle: product.handle,
        variant_id: variant.id,
        variant_title: variant.title,
        unit_price: variant.calculated_price.calculated_amount,
        compare_at_unit_price: variant.calculated_price.compare_at_amount,
        total: 0,
      },
      quantity,
    )
  }

  const requireLine = (lineItemId: string) => {
    const line = requireCart().items.find((item) => item.id === lineItemId)
    if (!line) throw new DataSourceError("not_found", `No line item "${lineItemId}" in the cart.`)
    return line
  }

  const emptyCart = (): StoreCart => ({
    id: `cart_mock_${nextId++}`,
    currency_code: "brl",
    email: null,
    items: [],
    shipping_address: null,
    billing_address: null,
    shipping_methods: [],
    item_subtotal: 0,
    shipping_total: 0,
    discount_total: 0,
    total: 0,
  })

  // `async` turns every throw above into a rejection, the same way the api source fails.
  /* eslint-disable @typescript-eslint/require-await */
  return {
    content: {
      async getHomeContent() {
        return structuredClone(homeContentFixture)
      },
    },
    products: {
      async listProducts(query = {}) {
        const limit = query.limit ?? 20
        const offset = query.offset ?? 0
        const matches = productFixtures.filter((product) => matchesQuery(product, query))
        sortByQuery(matches, query.order)
        return {
          products: structuredClone(matches.slice(offset, offset + limit)),
          count: matches.length,
          limit,
          offset,
        }
      },
      async listFacets(query = {}) {
        const base = productFixtures.filter((product) => matchesBase(product, query))
        const wanted = query.option_values ?? {}
        const prices = base
          .filter((product) => variantsMatching(product, wanted).length > 0)
          .map(lowestPrice)
        const inPriceRange = base.filter((product) => matchesPrice(product, query))
        return {
          options: [OPTION_TITLES.size, OPTION_TITLES.color].map((title) =>
            facetFor(inPriceRange, title, wanted),
          ),
          price: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
        }
      },
      async getProduct(handle) {
        const product = productFixtures.find((candidate) => candidate.handle === handle)
        return product ? structuredClone(product) : null
      },
    },
    cart: {
      async getCart() {
        return structuredClone(cart)
      },
      async addItem({ variant_id, quantity }) {
        const current = cart ?? emptyCart()
        const existing = current.items.find((item) => item.variant_id === variant_id)
        assertInStock(variant_id, (existing?.quantity ?? 0) + quantity)
        const items = existing
          ? current.items.map((item) =>
              item === existing ? withQuantity(item, item.quantity + quantity) : item,
            )
          : [...current.items, newLine(current.id, variant_id, quantity)]
        return saved({ ...current, items })
      },
      async updateItem(lineItemId, { quantity }) {
        const line = requireLine(lineItemId)
        assertInStock(line.variant_id, quantity)
        const current = requireCart()
        return saved({
          ...current,
          items: current.items.map((item) => (item === line ? withQuantity(item, quantity) : item)),
        })
      },
      async removeItem(lineItemId) {
        const line = requireLine(lineItemId)
        const current = requireCart()
        return saved({ ...current, items: current.items.filter((item) => item !== line) })
      },
    },
    checkout: {
      async setContact({ email, shipping_address, billing_address }) {
        return saved({
          ...requireCart(),
          email,
          shipping_address,
          billing_address: billing_address ?? shipping_address,
        })
      },
      async listShippingOptions() {
        return structuredClone(shippingOptionFixtures)
      },
      async selectShippingOption(optionId) {
        const option = shippingOptionFixtures.find((candidate) => candidate.id === optionId)
        if (!option) throw new DataSourceError("not_found", `No shipping option "${optionId}".`)
        return saved({
          ...requireCart(),
          shipping_methods: [
            {
              id: `sm_mock_${nextId++}`,
              shipping_option_id: option.id,
              name: option.name,
              amount: option.amount,
            },
          ],
        })
      },
      async listPaymentProviders() {
        return structuredClone(paymentProviderFixtures)
      },
      async startPayment({ provider_id }) {
        if (!paymentProviderFixtures.some((provider) => provider.id === provider_id)) {
          throw new DataSourceError("not_found", `No payment provider "${provider_id}".`)
        }
        paymentPolls = 0
        return {
          id: `payses_mock_${nextId++}`,
          provider_id,
          amount: requireCart().total,
          currency_code: "brl",
          status: "pending",
          data: { fictional: true },
        }
      },
      /** Pending on the first poll and paid from the second, so both screen states can be seen. */
      async getPaymentStatus() {
        paymentPolls += 1
        return paymentPolls < 2
          ? { status: "pending" }
          : { status: "paid", order_id: "order_mock_1" }
      },
    },
  }
  /* eslint-enable @typescript-eslint/require-await */
}
