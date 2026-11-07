import type {
  StoreAddToCart,
  StoreCart,
  StoreCartShippingOption,
  StoreCheckoutContact,
  StorePaymentProvider,
  StorePaymentSession,
  StorePaymentStatus,
  StoreProduct,
  StoreProductFacets,
  StoreProductListQuery,
  StoreProductListResponse,
  StoreStartPayment,
  StoreUpdateLineItem,
} from "@nozco/shared-types"

// These interfaces are the composables' public signatures. Every source implements exactly them, so
// the choice of source can never change what a page sees. All failures reject with a DataSourceError.
// Declared as function properties because callers destructure them: `const { addItem } = useCart()`.

/** A listing's filters, without its order and page: what `listFacets` receives. */
export type StoreProductFiltersQuery = Omit<StoreProductListQuery, "order" | "limit" | "offset">

export interface ProductsApi {
  listProducts: (query?: StoreProductListQuery) => Promise<StoreProductListResponse>
  /** What the filter controls offer for these filters. */
  listFacets: (query?: StoreProductFiltersQuery) => Promise<StoreProductFacets>
  /** Resolves to null when no product has this handle. */
  getProduct: (handle: string) => Promise<StoreProduct | null>
}

/** There is one current cart, so callers never handle its ID. */
export interface CartApi {
  /** Resolves to null while the customer has no cart. */
  getCart: () => Promise<StoreCart | null>
  addItem: (input: StoreAddToCart) => Promise<StoreCart>
  updateItem: (lineItemId: string, input: StoreUpdateLineItem) => Promise<StoreCart>
  removeItem: (lineItemId: string) => Promise<StoreCart>
}

/** Independent calls on the current cart, so they fit one page or several steps (DEC-03). */
export interface CheckoutApi {
  setContact: (input: StoreCheckoutContact) => Promise<StoreCart>
  listShippingOptions: () => Promise<StoreCartShippingOption[]>
  selectShippingOption: (optionId: string) => Promise<StoreCart>
  listPaymentProviders: () => Promise<StorePaymentProvider[]>
  startPayment: (input: StoreStartPayment) => Promise<StorePaymentSession>
  getPaymentStatus: () => Promise<StorePaymentStatus>
}

export interface DataSource {
  products: ProductsApi
  cart: CartApi
  checkout: CheckoutApi
}
