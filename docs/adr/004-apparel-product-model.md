# 004 - Apparel product model

- **Status:** accepted
- **Date:** 2026-11-06
- **Decided by:** Thales Reiser, on 2026-11-07
- **Reference:** Q-03, BE-02.1

## Context

A garment has sizes and colours, one variant and SKU per combination, stock per variant and a
promotional price. Q-03 (garment types, size grid, fabric) is still open, so the model cannot fix any of
them. `CLAUDE.md` asks for Medusa's modules before custom ones.

## Options considered

### Sizes, colours and garment types

1. **Medusa product options and product types, with values given per product (chosen):** nothing changes
   in code when Q-03 is answered, and the admin edits them. Only the option titles (`Tamanho`, `Cor`) are
   fixed, because the store filters by them. The cost is that nothing enforces one grid across products.
2. **A size-grid table or enum:** enforces consistency, but it hard-codes an open decision and adds a
   custom module.

### Variants and SKUs

1. **Pure helper that derives the SKU from prefix, colour and size, passing the result to
   `createProductsWorkflow` (chosen):** stable, because list order does not matter, and readable on a
   label. A collision inside a product is an error, and Medusa's unique SKU index catches one across
   products. A renamed colour keeps its stored SKU, since the helper runs only at creation. Variants
   created by hand in the admin do not go through it.
2. **Random or sequential SKUs:** never collide, but they change on every import and say nothing to
   whoever packs the order.
3. **A custom product module:** duplicates what Medusa covers.

### Stock

1. **Medusa's inventory module with one level per variant at the BE-01.2 location (chosen):** Medusa
   creates one inventory item per variant, and `inventory_quantity` already respects the sales channel.
   A combination with no stock still gets a level at zero, so it can be restocked. `allow_backorder` is
   off, so stock is what limits a sale.
2. **`manage_inventory: false` with a stock field in metadata:** simple, but it loses reservations and
   the admin stock screens.

Creating the product and its levels runs as one workflow, so a failure leaves nothing behind.

### Compare-at price

1. **Price list of type `sale` (chosen):** the variant's own price is the regular price and the list
   holds the lower one. The Store API returns them as `original_amount` and `calculated_amount`. Sales
   can have dates and the admin manages them. A list lower than the regular price is required by the
   helper; a list created in the admin is not checked.
2. **A `compare_at` value in metadata:** it would not expire with a sale, and Medusa's cart and order
   totals would ignore it.

Amounts are stored in major units, as Medusa v2 does: 20.5 is R$ 20,50. The conversion to integer cents
stays at the boundary, in `apps/storefront/server/utils/store-mappers.ts`.

### Fabric, care, weight and dimensions

1. **Typed metadata validated by a Zod schema in `packages/shared-types` (chosen, as the plan asks):**
   needs no migration, states its units (`weight_g`, `length_cm`), and covers `care`, which Medusa has no
   field for. It is flat because the admin editor cannot edit nested values. Product hooks validate it on
   every create and update, including the admin's, and undo the change when it is invalid. The cost is
   that the Store API needs `+metadata` to return it.
2. **Medusa's own columns (`weight`, `length`, `height`, `width`, `material`):** shown as form fields in
   the admin, returned by default and available per variant, but with no stated unit, no `care` field and
   no shared validation. The admin still shows these fields, so whoever fills in products must leave them
   empty. **Point for review:** BE-06.1 may prefer them if weight varies by size, which would be an
   additive change.

### Categories and collections

Medusa's models cover them, including filtering in the Store API, so nothing custom exists. Its collection
has `title` where `StoreProductTaxon` has `name`, so BE-02.4 maps that field.

## Decision

Thales accepted the options marked "chosen" on 2026-11-07, including weight and dimensions in metadata.
The answer to Q-03 only adds data, unless it asks for a rule that a grid must be the same across products.

## Consequences

- No migration or custom module. Scripts and imports call `createApparelProduct`.
- `createProductsWorkflow` and `updateProductsWorkflow` take one consumer per hook, and these hooks are now
  used by `src/workflows/hooks/validate-apparel-metadata.ts`.
- Metadata set per product means one weight for all sizes of a garment until BE-06.1 says otherwise.
- `shipping_profile_id` is passed through but not set up here; that belongs to the shipping tasks.
