# 008 - Home blocks and their order

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser
- **Reference:** DEC-06, BE-02.5, FE-11.1

## Context

RF-01 lists what the home page contains, but not the order. The order decides what a customer sees right
after the banner, and which blocks need content from the back office. Thales compared two mock-ups,
on desktop and on mobile. Their texts and products were examples.

## Options considered

1. **Option A, "vitrine primeiro":** banner, value-proposition strip, new arrivals, collections. It leads
   straight to the products, which helps whoever arrives to buy, and it shows the guarantees early. It
   works with a small catalog, because new arrivals exist from the first product.
2. **Option B, "coleções primeiro":** banner, collections, best sellers, value-proposition strip. It
   reinforces the brand, but it needs strong collections from launch and sales data for best sellers, and
   the guarantees only appear at the end of the page.

## Decision

Option A, chosen by Thales: banner, value-proposition strip, new arrivals, collections.

## Consequences

- FE-11.1 builds the home page in this order.
- BE-02.5 stores what the blocks cannot get from the catalog: banners, and the announcement bar that
  RF-01 also asks for, which sits above every page (FE-11.3). `GET /store/content/home` returns them.
- New arrivals come from `GET /store/catalog/products` sorted by `newest`, and collections from Medusa.
  Neither needs new content storage.
- The value-proposition strip is not back-office content in this decision. FE-11.1 renders it from the
  translation file, with the copy Thales approves.
- This decision does not settle whether several banners show as a carousel. The module stores several
  in order, so either answer works without a backend change.
