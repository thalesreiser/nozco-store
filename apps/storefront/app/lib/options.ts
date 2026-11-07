/** One choice in a SizeSelector or ColourSwatch. */
export interface SelectableOption {
  value: string
  label: string
  /** Unavailable options stay visible and cannot be selected. Defaults to available. */
  available?: boolean
  /** Any CSS colour for the swatch chip. No product data provides it yet; see ColourSwatch.vue. */
  fill?: string
}

export type StockStatus = "in" | "low" | "out"
