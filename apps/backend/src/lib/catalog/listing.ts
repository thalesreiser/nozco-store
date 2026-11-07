import {
  APPAREL_OPTION_TITLES,
  apparelMetadataSchema,
  type ApparelMetadata,
  type StoreProductListQuery,
  type StoreProductOrder,
} from "@nozco/shared-types"

// The rules of the store listing, as pure functions over rows already loaded by `load.ts`. Amounts stay
// in major units, as everywhere in Medusa; only the price filter, which the contract states in cents,
// converts to compare.

type Maybe<T> = T | null | undefined

type RowImage = { id: string; url: string; rank: number }
type RowOptionValue = { id: string; value: string; option_id?: Maybe<string> }

export type CatalogVariantRow = {
  id: string
  product_id?: Maybe<string>
  title: string
  sku?: Maybe<string>
  manage_inventory?: Maybe<boolean>
  allow_backorder?: Maybe<boolean>
  options?: Maybe<RowOptionValue[]>
  images?: Maybe<RowImage[]>
  calculated_price?: Maybe<{
    calculated_amount?: Maybe<number>
    original_amount?: Maybe<number>
    currency_code?: Maybe<string>
  }>
}

export type CatalogProductRow = {
  id: string
  title: string
  handle: string
  subtitle?: Maybe<string>
  description?: Maybe<string>
  thumbnail?: Maybe<string>
  created_at: string | Date
  metadata?: unknown
  options?: Maybe<{ id: string; title: string; values?: Maybe<RowOptionValue[]> }[]>
  variants?: Maybe<CatalogVariantRow[]>
  images?: Maybe<RowImage[]>
  categories?: Maybe<
    {
      id: string
      handle: string
      name: string
      is_active?: Maybe<boolean>
      is_internal?: Maybe<boolean>
    }[]
  >
  collection?: Maybe<{ id: string; handle: string; title: string }>
  tags?: Maybe<{ value: string }[]>
}

export type PublicOptionValue = { id: string; value: string; option_id: string }

export type PublicVariant = {
  id: string
  product_id: string
  title: string
  sku: string | null
  inventory_quantity: number
  in_stock: boolean
  options: PublicOptionValue[]
  images: RowImage[]
  calculated_price: {
    calculated_amount: number
    original_amount: number | null
    currency_code: string
  }
}

/** Everything a customer may see of a product. Built field by field, so a new column stays private. */
export type PublicProduct = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string | null
  thumbnail: string | null
  options: { id: string; title: string; values: PublicOptionValue[] }[]
  variants: PublicVariant[]
  images: RowImage[]
  categories: { id: string; handle: string; name: string }[]
  collection: { id: string; handle: string; title: string } | null
  metadata: ApparelMetadata | null
}

/** A public product and what the listing also needs but does not return. */
export type CatalogProduct = { product: PublicProduct; tags: string[]; createdAt: number }

/** Availability by variant ID, as Medusa computes it; null when no inventory item is linked. */
export type VariantAvailability = Record<string, { availability: number | null } | undefined>

function toPublicVariant(
  row: CatalogVariantRow,
  productId: string,
  availability: VariantAvailability,
): PublicVariant | null {
  const price = row.calculated_price
  if (typeof price?.calculated_amount !== "number") {
    return null
  }
  const tracked = row.manage_inventory ?? true
  const quantity = tracked ? (availability[row.id]?.availability ?? 0) : 0
  return {
    id: row.id,
    product_id: row.product_id ?? productId,
    title: row.title,
    sku: row.sku ?? null,
    inventory_quantity: quantity,
    in_stock: !tracked || Boolean(row.allow_backorder) || quantity > 0,
    options: (row.options ?? []).map(toPublicOptionValue),
    images: (row.images ?? []).map(toPublicImage),
    calculated_price: {
      calculated_amount: price.calculated_amount,
      original_amount: price.original_amount ?? null,
      currency_code: price.currency_code ?? "",
    },
  }
}

function toPublicOptionValue(row: RowOptionValue): PublicOptionValue {
  return { id: row.id, value: row.value, option_id: row.option_id ?? "" }
}

function toPublicImage(row: RowImage): RowImage {
  return { id: row.id, url: row.url, rank: row.rank }
}

/**
 * Null when no variant has a price in the region, since nothing of it can be sold there. Internal and
 * inactive categories are left out, and metadata keeps only the garment fields.
 */
export function toCatalogProduct(
  row: CatalogProductRow,
  availability: VariantAvailability,
): CatalogProduct | null {
  const variants = (row.variants ?? []).flatMap((variant) => {
    const mapped = toPublicVariant(variant, row.id, availability)
    return mapped ? [mapped] : []
  })
  if (variants.length === 0) {
    return null
  }
  const metadata = apparelMetadataSchema.safeParse(row.metadata ?? {})
  return {
    tags: (row.tags ?? []).map((tag) => tag.value),
    createdAt: new Date(row.created_at).getTime(),
    product: {
      id: row.id,
      title: row.title,
      handle: row.handle,
      subtitle: row.subtitle ?? null,
      description: row.description ?? null,
      thumbnail: row.thumbnail ?? null,
      options: (row.options ?? []).map((option) => ({
        id: option.id,
        title: option.title,
        values: (option.values ?? []).map(toPublicOptionValue),
      })),
      variants,
      images: (row.images ?? []).map(toPublicImage),
      categories: (row.categories ?? [])
        .filter((category) => category.is_active !== false && category.is_internal !== true)
        .map(({ id, handle, name }) => ({ id, handle, name })),
      collection: row.collection
        ? { id: row.collection.id, handle: row.collection.handle, title: row.collection.title }
        : null,
      metadata: metadata.success ? metadata.data : null,
    },
  }
}

const lowestPrice = ({ product }: CatalogProduct) =>
  Math.min(...product.variants.map((variant) => variant.calculated_price.calculated_amount))

const toCents = (major: number) => Math.round(major * 100)

/** Lowercase and without accents, so "calcao" finds "Calção". */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

/** RF-04: every word of the term appears in the name, a category or a tag. */
function matchesText({ product, tags }: CatalogProduct, term: string) {
  const haystack = normalize(
    [product.title, ...product.categories.map((category) => category.name), ...tags].join(" "),
  )
  return normalize(term)
    .split(/\s+/)
    .every((word) => haystack.includes(word))
}

/** One variant has to hold every value asked for: "M in black" is not "M in white and L in black". */
function variantsMatching({ product }: CatalogProduct, wanted: Record<string, string[]>) {
  const titles = new Map(product.options.map((option) => [option.id, option.title]))
  const entries = Object.entries(wanted)
  return product.variants.filter((variant) =>
    entries.every(([title, values]) =>
      variant.options.some(
        (value) => titles.get(value.option_id) === title && values.includes(value.value),
      ),
    ),
  )
}

type Filters = Omit<StoreProductListQuery, "order" | "limit" | "offset">

function matchesPrice(item: CatalogProduct, { min_price, max_price }: Filters) {
  const price = toCents(lowestPrice(item))
  return (
    (min_price === undefined || price >= min_price) &&
    (max_price === undefined || price <= max_price)
  )
}

/** Everything except the options and the price, which the facets relax one at a time. */
function matchesBase(item: CatalogProduct, query: Filters) {
  const { product } = item
  return (
    (!query.q || matchesText(item, query.q)) &&
    (!query.category_handle ||
      product.categories.some((category) => category.handle === query.category_handle)) &&
    (!query.collection_handle || product.collection?.handle === query.collection_handle)
  )
}

export function filterCatalog(items: CatalogProduct[], query: Filters) {
  const wanted = query.option_values ?? {}
  return items.filter(
    (item) =>
      matchesBase(item, query) &&
      matchesPrice(item, query) &&
      variantsMatching(item, wanted).length > 0,
  )
}

/** Largest relative discount of any variant; 0 when none is on sale. */
function bestDiscount({ product }: CatalogProduct) {
  return Math.max(
    ...product.variants.map(({ calculated_price: { original_amount, calculated_amount } }) =>
      original_amount && original_amount > calculated_amount
        ? (original_amount - calculated_amount) / original_amount
        : 0,
    ),
  )
}

/** Returns a new list. Ties fall to the newest product, then the ID, so that pages do not overlap. */
export function sortCatalog(
  items: CatalogProduct[],
  order: StoreProductOrder = "newest",
  unitsSold: ReadonlyMap<string, number> = new Map(),
) {
  const sold = (item: CatalogProduct) => unitsSold.get(item.product.id) ?? 0
  const rank: Record<StoreProductOrder, (a: CatalogProduct, b: CatalogProduct) => number> = {
    best_selling: (a, b) => sold(b) - sold(a),
    newest: () => 0,
    price_asc: (a, b) => lowestPrice(a) - lowestPrice(b),
    price_desc: (a, b) => lowestPrice(b) - lowestPrice(a),
    on_sale: (a, b) => bestDiscount(b) - bestDiscount(a),
  }
  return [...items].sort(
    (a, b) =>
      rank[order](a, b) || b.createdAt - a.createdAt || a.product.id.localeCompare(b.product.id),
  )
}

export type OrderRow = { items?: Maybe<{ product_id?: Maybe<string>; quantity?: Maybe<number> }[]> }

export function sumUnitsSold(orders: OrderRow[]) {
  const units = new Map<string, number>()
  for (const item of orders.flatMap((order) => order.items ?? [])) {
    if (item.product_id) {
      units.set(item.product_id, (units.get(item.product_id) ?? 0) + (item.quantity ?? 0))
    }
  }
  return units
}

/** The sizes come out in text order until Q-03 settles a grid: nothing stores their sequence yet. */
function facetFor(items: CatalogProduct[], title: string, query: Filters) {
  const { [title]: _ignored, ...others } = query.option_values ?? {}
  const counts = new Map<string, number>()
  for (const item of items) {
    const optionIds = new Set(
      item.product.options.filter((option) => option.title === title).map((option) => option.id),
    )
    const values = variantsMatching(item, others).flatMap((variant) =>
      variant.options.filter((value) => optionIds.has(value.option_id)).map((value) => value.value),
    )
    for (const value of new Set(values)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }
  return {
    title,
    values: [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value, "pt-BR", { numeric: true })),
  }
}

/**
 * Each option is counted with the filters of the others only, so picking a size still shows the other
 * sizes. The price range ignores the price filter for the same reason.
 */
export function buildFacets(items: CatalogProduct[], query: Filters) {
  const base = items.filter((item) => matchesBase(item, query))
  const wanted = query.option_values ?? {}
  const priced = base.filter((item) => variantsMatching(item, wanted).length > 0).map(lowestPrice)
  const inPriceRange = base.filter((item) => matchesPrice(item, query))
  return {
    options: [APPAREL_OPTION_TITLES.size, APPAREL_OPTION_TITLES.color].map((title) =>
      facetFor(inPriceRange, title, query),
    ),
    price: priced.length ? { min: Math.min(...priced), max: Math.max(...priced) } : null,
  }
}
