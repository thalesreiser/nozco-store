# 013 - Public stock cap, size order and where a colour's value is stored

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser for the rules; the storage location is an implementation choice listed in the PR
- **Reference:** BE-02.6, BE-02.4, ADR 007, and the store decisions of 2026-11-07 (ADR 011, ADR 012)

## Context

Thales decided that size and colour filters match only variants in stock, that public stock is capped at
10, and that a colour shows a swatch with its name. The catalog had no colour value to give the swatch.

Two facts limit where that value can live: the Medusa Admin metadata editor cannot edit nested values, and
one colour name can repeat across products. Colour names are data, so no list of them can sit in the code.

## Options considered

### Where the colour value lives

1. **A flat key in the product's metadata, `color_hex:<colour name>` (chosen).** Operators edit it in the
   standard product metadata screen. It belongs to one product, so two products can give "Azul" different
   values. Renaming a colour means renaming its key; until then the store shows the name only.
2. **`metadata` of the product option value.** The closest place in the model, but the Admin screens of
   Medusa 2.22 offer no editor for it, so operators could not set the value.
3. **`metadata` of each variant.** Editable, but one colour repeats on every size, and the copies can
   disagree.
4. **One nested map in the product's metadata, or a list of colours in a custom module.** The first cannot
   be edited in the Admin. The second adds a module, and one value per name would not allow two products to
   differ.

### Keeping the exact stock out of the standard routes

Cap the number in the response (chosen), or strip `inventory_quantity`. Capping keeps the field that those
routes already document, and gives the same answer as `/store/catalog`.

## Decision

- A variant's `inventory_quantity` is at most `PUBLIC_STOCK_CAP` (10) on `/store/catalog` and on the standard
  routes of ADR 007. A value below 10 is exact, and 10 means "10 or more". `in_stock` reads the real number.
  The other fields that carry a stock number are stripped there too.
- The store treats 5 units or fewer as low stock (ADR 012), which the cap leaves exact:
  `in_stock && inventory_quantity > 0 && inventory_quantity <= 5`. An untracked or backorder variant has 0
  with `in_stock: true`, and is not low.
- Filters on size or colour, and the counts of the facets, consider only variants with `in_stock`, on the
  same variant. A listing with no size or colour filter still shows a sold-out product. A value with nothing
  in stock leaves the facets.
- Sizes come back in the order of the launch grid of ADR 012 (P, M, G, GG, XGG), on each product's size
  values and on the size facet. Unknown sizes follow in text order, so a new size still works. This is an
  order only: products keep their own sizes and no grid is enforced.
- Colour value: the key is `color_hex:` plus the exact colour name, and the value is `#rrggbb`. Saving an
  invalid one fails, through the same product workflow hooks as the rest of the garment metadata; a bad one
  already stored reads as absent. The value reaches the store as `color_hex`, on option values and on colour
  facets, and never in `metadata`. A facet is one name across products, so it gives the value most of them
  use, with ties in text order.

## Consequences

- To give a colour its value, add to the product's metadata in the Admin a key such as `color_hex:Preto` with
  a value such as `#111111`.
- With no value, the store shows the name only.
- The price, cart and stock checks do not use the capped number: the server keeps reading the real one.
- Asking a cart for more units than exist can still reveal the stock one failure at a time. The cap covers
  what the store routes show, not this.
