import type { StoreProduct, StoreProductFacets } from "@nozco/shared-types"
import type { MaybeRefOrGetter } from "vue"
import { computed, toValue } from "vue"
import type { RouteLocationRaw } from "vue-router"
import type { ListingScope, ListingState, ProductCardData } from "~/lib/listing"
import {
  parseListingState,
  toFiltersQuery,
  toListQuery,
  toProductCard,
  toRouteQuery,
} from "~/lib/listing"

interface ListingData {
  products: ProductCardData[]
  count: number
  facets: StoreProductFacets
  /** Whether the category or collection has any product at all, whatever the filters. */
  scopeHasProducts: boolean
  scopeName: string | null
}

/** The data source has no taxonomy call yet (see useCatalogMenu), so the name comes from a product. */
function scopeNameOf(product: StoreProduct, scope: ListingScope) {
  if (scope.collection_handle) return product.collection?.name ?? null
  return (
    product.categories.find((category) => category.handle === scope.category_handle)?.name ?? null
  )
}

/** The state of a listing page lives in the URL: it is read from there and changed by navigating. */
export function useProductListing(scope: MaybeRefOrGetter<ListingScope>) {
  const route = useRoute()
  const router = useRouter()
  const { listFacets, listProducts } = useProducts()
  const state = computed(() => parseListingState(route.query))

  const load = async (): Promise<ListingData> => {
    const currentScope = toValue(scope)
    const [page, facets] = await Promise.all([
      listProducts(toListQuery(state.value, currentScope)),
      listFacets(toFiltersQuery(state.value, currentScope)),
    ])
    // Filters can leave nothing to read the name from, and only then is a second call needed.
    const namedBy =
      page.products[0] ?? (await listProducts({ ...currentScope, limit: 1 })).products[0]
    return {
      products: page.products.map(toProductCard),
      count: page.count,
      facets,
      scopeHasProducts: Boolean(namedBy),
      scopeName: namedBy ? scopeNameOf(namedBy, currentScope) : null,
    }
  }

  const key = computed(() => `listing:${JSON.stringify([toValue(scope), state.value])}`)
  const result = useLazyAsyncData(key, load)
  const { data, status, refresh } = result

  // A new URL has no data until it loads, and the filter controls must not vanish in the meantime.
  let latest: ListingData | null = null
  const lastLoaded = computed(() => (latest = data.value ?? latest))
  const facets = computed(() => lastLoaded.value?.facets ?? null)
  const scopeName = computed(() => lastLoaded.value?.scopeName ?? null)

  const pageTo = (page: number): RouteLocationRaw => ({
    query: toRouteQuery({ ...state.value, page }, route.query),
  })

  /** Any change other than the page itself goes back to the first page. */
  const update = (patch: Partial<ListingState>) =>
    router.push({ query: toRouteQuery({ ...state.value, page: 1, ...patch }, route.query) })

  const clearFilters = () =>
    router.push({
      query: toRouteQuery({ options: {}, order: state.value.order, page: 1 }, route.query),
    })

  return {
    /** Awaited by the page so that the server waits for the data; a browser navigation does not. */
    ready: result,
    state,
    data,
    facets,
    scopeName,
    loading: computed(() => status.value === "pending" || status.value === "idle"),
    failed: computed(() => status.value === "error"),
    retry: () => refresh(),
    pageTo,
    update,
    clearFilters,
  }
}
