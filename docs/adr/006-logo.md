# 006 - Logo

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser
- **Reference:** Q-12, FE-12.2, FE-11.3

## Context

Thales supplied logo studies as a reference: a wide chamfered wordmark, barbed wire, a worn stamp and a
stacked stencil. They were not final files, so original vectors were drawn from them. The files are in
`docs/brand/`.

## Options considered

1. **L1, wordmark "NoZCo." (chosen for the site):** wide and chamfered. It stays legible at small sizes.
2. **L2, wordmark between two strands of barbed wire:** distinctive, but needs a lot of horizontal room
   and does not fit a phone header.
3. **L3, worn stamp:** suits labels, packaging and prints. The texture disappears at small sizes.
4. **L4, stacked stencil:** the closest to direction D (ADR 005). Suits a chest print.

## Decision

Thales chose L1 as the site logo, with the barbed wire as a supporting graphic. L3 and L4 stay available
for products and packaging.

## Consequences

- `BrandMark.vue` draws L1, and it is the only place on the site that draws the logo.
- `nozco-carimbo.svg` uses a browser filter for its wear, so print needs a separate vector version.
- A trademark search at INPI is advisable before products carry the logo. It has not been done.
- FE-12.2 still covers photo treatment and tone of voice.
