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
])

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
      .map(([key, field]) => [key, strip(field)]),
  )
}

/** Takes the body as it would be sent, so a date or a class instance cannot carry a field past this. */
export function withoutPrivateProductFields(body: unknown): unknown {
  const json = JSON.stringify(body)
  return json === undefined ? body : strip(JSON.parse(json))
}
