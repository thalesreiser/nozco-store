import { capPublicStock } from "@nozco/shared-types"

/**
 * What Medusa's standard product routes may not return, at any depth. Refusing `fields` would not be
 * enough: their defaults already include `*variants`, which holds `barcode` and `metadata`. See
 * `docs/adr/007-store-product-exposure-and-rate-limit.md`.
 */
const PRIVATE_KEYS = new Set([
  "metadata",
  "external_id",
  "barcode",
  "prices",
  "inventory_items",
  "location_levels",
  "ean",
  "upc",
  "hs_code",
  "mid_code",
  "inventory",
  "stocked_quantity",
  "reserved_quantity",
  "available_quantity",
])

/** The same cap as `/store/catalog`, so these routes cannot be used to read the exact number. */
const capStock = (key: string, value: unknown) =>
  key === "inventory_quantity" && typeof value === "number" ? capPublicStock(value) : strip(value)

function strip(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(strip)
  }
  if (typeof value !== "object" || value === null) {
    return value
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_KEYS.has(key))
      .map(([key, field]) => [key, capStock(key, field)]),
  )
}

/** Takes the body as it would be sent, so a date or a class instance cannot carry a field past this. */
export function withoutPrivateProductFields(body: unknown): unknown {
  const json = JSON.stringify(body)
  return json === undefined ? body : strip(JSON.parse(json))
}
