# 005 - Visual direction

- **Status:** accepted
- **Date:** 2026-11-06
- **Decided by:** Thales Reiser
- **Reference:** DEC-01, DEC-02, FE-01.2, FE-12.1

## Context

The brand identity is inspired by urban art, in black, white and grey. Before building tokens and base
components, three directions were compared on one mock-up with the same content: A (Estêncil: black
ground, hard outlines and offset shadows), B (Galeria: white ground, clean surfaces) and C (Lambe-lambe:
concrete ground, condensed type, one accent colour).

## Options considered

1. **A, Estêncil:** strongest street character, but heavy outlines compete with the printed designs.
2. **B, Galeria:** the designs stand out and products are easy to compare, but it is close to any store.
3. **C, Lambe-lambe:** one accent colour makes buying obvious, but it leaves the agreed palette.
4. **D, a mix:** the brand of A in the top of the page and the store of B below it.

## Decision

Option D.

- **Brand areas (header, home highlight, section titles):** black ground and condensed heavy type.
- **Store areas (listing, product, cart, checkout):** white ground, generous space around photos, and no
  outlines or offset shadows on cards.
- **Palette:** black, white and greys only. No accent colour; purchase buttons are black on white.
- **Fonts:** Big Shoulders Display for titles and Archivo for all other text, self-hosted.

The NOZCO wordmark in the mock-up is placeholder text, not a logo. The logo stays open in Q-12.

## Consequences

- FE-01.2 turns this into semantic tokens and checks contrast for each text pair.
- FE-12.1 builds the base components without outlines or offset shadows on cards.
- With a clean store, product photos carry the brand, which raises the importance of Q-08.
- The hard transition from the black area to the white one is checked on real screens.
