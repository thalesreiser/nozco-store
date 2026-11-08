import type {
  Cents,
  StoreProduct,
  StoreProductListQuery,
  StoreProductOrder,
} from "@nozco/shared-types"
import type { LocationQuery, LocationQueryRaw } from "vue-router"
import type { StoreProductFiltersQuery } from "~/data/source"
import { DEFAULT_LIMIT, OPTION_TITLES, PRODUCT_ORDERS } from "./catalog-contract"
import type { StockStatus } from "./options"

export const LISTING_PAGE_SIZE = DEFAULT_LIMIT
export const LISTING_DEFAULT_ORDER: StoreProductOrder = "newest"

/** What a listing page shows, as it is kept in the URL. One value per option: see OptionGroup. */
export interface ListingState {
  /** Selected value by option title. */
  options: Record<string, string>
  minPrice?: Cents
  maxPrice?: Cents
  order: StoreProductOrder
  page: number
}

export type ListingScope = Pick<StoreProductListQuery, "category_handle" | "collection_handle">

const OPTION_PARAMS = {
  [OPTION_TITLES.size]: "tamanho",
  [OPTION_TITLES.color]: "cor",
} as const
const MIN_PARAM = "preco_min"
const MAX_PARAM = "preco_max"
const ORDER_PARAM = "ordem"
const PAGE_PARAM = "pagina"
const LISTING_PARAMS = new Set<string>([
  ...Object.values(OPTION_PARAMS),
  MIN_PARAM,
  MAX_PARAM,
  ORDER_PARAM,
  PAGE_PARAM,
])

/** The longest text the catalog API accepts (`storeProductListRequestSchema`). */
const MAX_TEXT = 100

function singleValue(value: LocationQuery[string] | undefined) {
  const text = (Array.isArray(value) ? value[0] : value)?.trim()
  return text && text.length <= MAX_TEXT ? text : undefined
}

function wholeNumber(value: LocationQuery[string] | undefined) {
  const text = singleValue(value)
  if (!text || !/^\d+$/.test(text)) return undefined
  const number = Number(text)
  return Number.isSafeInteger(number) ? number : undefined
}

const isOrder = (value: string | undefined): value is StoreProductOrder =>
  PRODUCT_ORDERS.some((order) => order === value)

/** A URL can hold anything. What the API would refuse is dropped, so a bad link still lists products. */
export function parseListingState(query: LocationQuery): ListingState {
  const options: Record<string, string> = {}
  for (const [title, param] of Object.entries(OPTION_PARAMS)) {
    const value = singleValue(query[param])
    if (value) options[title] = value
  }
  const min = wholeNumber(query[MIN_PARAM])
  const max = wholeNumber(query[MAX_PARAM])
  const pricesAreOrdered = min === undefined || max === undefined || min <= max
  const order = singleValue(query[ORDER_PARAM])
  return {
    options,
    ...(pricesAreOrdered && min !== undefined && { minPrice: min }),
    ...(pricesAreOrdered && max !== undefined && { maxPrice: max }),
    order: isOrder(order) ? order : LISTING_DEFAULT_ORDER,
    page: Math.max(wholeNumber(query[PAGE_PARAM]) ?? 1, 1),
  }
}

/** Default values stay out of the URL. Parameters of others, such as campaign tags, are kept. */
export function toRouteQuery(state: ListingState, current: LocationQuery = {}): LocationQueryRaw {
  const query: LocationQueryRaw = Object.fromEntries(
    Object.entries(current).filter(([param]) => !LISTING_PARAMS.has(param)),
  )
  for (const [title, param] of Object.entries(OPTION_PARAMS)) {
    if (state.options[title]) query[param] = state.options[title]
  }
  if (state.minPrice !== undefined) query[MIN_PARAM] = String(state.minPrice)
  if (state.maxPrice !== undefined) query[MAX_PARAM] = String(state.maxPrice)
  if (state.order !== LISTING_DEFAULT_ORDER) query[ORDER_PARAM] = state.order
  if (state.page > 1) query[PAGE_PARAM] = String(state.page)
  return query
}

export function toFiltersQuery(state: ListingState, scope: ListingScope): StoreProductFiltersQuery {
  const selected = Object.entries(state.options)
  return {
    ...scope,
    ...(selected.length > 0 && {
      option_values: Object.fromEntries(selected.map(([title, value]) => [title, [value]])),
    }),
    ...(state.minPrice !== undefined && { min_price: state.minPrice }),
    ...(state.maxPrice !== undefined && { max_price: state.maxPrice }),
  }
}

export function toListQuery(state: ListingState, scope: ListingScope): StoreProductListQuery {
  return {
    ...toFiltersQuery(state, scope),
    order: state.order,
    limit: LISTING_PAGE_SIZE,
    offset: (state.page - 1) * LISTING_PAGE_SIZE,
  }
}

export function activeFilterCount(state: ListingState) {
  const hasPrice = state.minPrice !== undefined || state.maxPrice !== undefined
  return Object.keys(state.options).length + (hasPrice ? 1 : 0)
}

/** The state after one option changes; `undefined` removes that option's filter. */
export function withOption(state: ListingState, title: string, value: string | undefined) {
  const { [title]: _removed, ...others } = state.options
  return value ? { ...others, [title]: value } : others
}

/** One text, so a screen reader hears the filter and its value as written. */
export const filterLabel = (name: string, value: string | undefined) =>
  value ? `${name}: ${value}` : name

/** The numbers to link: the ends and the current page's neighbours, with `null` for a gap. */
export function paginationItems(page: number, pageCount: number): (number | null)[] {
  const items: (number | null)[] = []
  for (let number = 1; number <= pageCount; number++) {
    if (number === 1 || number === pageCount || Math.abs(number - page) <= 1) {
      const previous = items.at(-1)
      if (typeof previous === "number" && number - previous > 1) items.push(null)
      items.push(number)
    }
  }
  return items
}

/** Only what a card shows, so a page's SSR payload does not carry every variant of every product. */
export interface ProductCardData {
  handle: string
  title: string
  price: Cents
  compareAt: Cents | null
  stock: StockStatus
  image: string | null
}

export const productPath = (handle: string) => `/produto/${handle}`

/** "Últimas" shows at this many units or fewer (ADR 012). Public stock is capped at 10, so it still applies. */
export const LOW_STOCK_MAX = 5

export function stockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "out"
  return quantity <= LOW_STOCK_MAX ? "low" : "in"
}

/**
 * The whole percentage off, rounded down so the badge never promises more than the real discount.
 * `null` when there is no sale or the discount is under 1%.
 */
export function discountPercent(price: Cents, compareAt: Cents | null): number | null {
  if (!compareAt || compareAt <= price) return null
  const percent = Math.floor(((compareAt - price) * 100) / compareAt)
  return percent >= 1 ? percent : null
}

/** The card shows the lowest price, the one the price filter and sorting use. */
export function toProductCard(product: StoreProduct): ProductCardData {
  const prices = product.variants.map((variant) => variant.calculated_price)
  const lowest = prices.reduce<(typeof prices)[number] | null>(
    (best, price) => (!best || price.calculated_amount < best.calculated_amount ? price : best),
    null,
  )
  const units = product.variants.reduce(
    (sum, variant) => sum + Math.max(variant.inventory_quantity, 0),
    0,
  )
  return {
    handle: product.handle,
    title: product.title,
    price: lowest?.calculated_amount ?? 0,
    compareAt: lowest?.compare_at_amount ?? null,
    stock: stockStatus(units),
    image: product.thumbnail,
  }
}
