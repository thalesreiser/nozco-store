# 007 - Store product exposure and catalog rate limit

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser
- **Reference:** BE-02.4

## Context

The publishable key is public by design, and Medusa's `GET /store/products` and `GET /store/products/:id`
let its holder ask for `metadata`, `external_id`, `variants.prices` and stock location levels. Their
default fields also include `*variants`, which returns `barcode` and variant `metadata` unasked. A `cost`
key typed into metadata in the admin would be public.

The `/store/catalog` routes read the whole catalog on each request and had no rate limit.

## Options considered

### Exposed fields

1. **Hide the fields on the standard routes (chosen).**
2. **Leave them and forbid private data in metadata:** no code, but one mistake from a leak.
3. **Block the routes entirely:** the smallest surface, but it removes standard routes.

### Rate limit

Add a rule to the existing limiter (chosen), or leave the routes unlimited.

## Decision

Thales chose to hide the fields and to add the limit.

The fields are stripped from the response rather than refused in `fields`, because refusing would miss
what the defaults already return. The keys are removed at any depth: `metadata`, `external_id`, `barcode`,
`ean`, `upc`, `hs_code`, `mid_code`, `prices`, `inventory_items` and `location_levels`. [ADR 013](013-catalog-stock-and-colour-value.md)
adds `inventory` and the stock quantity fields, and caps `inventory_quantity`.

The rule covers `/store/products`, `/store/product-variants`, `/store/product-categories`,
`/store/product-tags`, `/store/product-types` and `/store/collections`.

The rule is `catalog`, shared by the three routes: 600 requests per address per minute by default, set by
`RATE_LIMIT_CATALOG_MAX_PER_IP` and `RATE_LIMIT_CATALOG_WINDOW_SECONDS`.

## Consequences

- Garment metadata reaches the store only through `/store/catalog`, which returns the fields of
  `apparelMetadataSchema` and nothing else. `apparel-product.spec.ts` now reads it there.
- A later Medusa upgrade may add store routes that return products. They need adding to the list in
  `apps/backend/src/api/middlewares.ts`.
- Medusa sees the storefront Worker's address (see `apps/storefront/server/utils/medusa.ts`), so requests
  through one Worker address share one counter until that pending decision is taken. The default is high
  for this reason.
