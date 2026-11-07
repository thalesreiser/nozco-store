# 010 - Accent colours

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser
- **Reference:** DEC-01, ADR 005, FE-01.2, FE-11.1

## Context

ADR 005 kept the palette to black, white and greys. Thales asked for a third colour that adds contrast
and a subtle glow while black and white stay the main statement. The options were compared on the chosen
home page.

## Options considered

1. **One accent:** amber, gold, orange, silver, steel, warm silver, spray red, carmine, coral or neon cyan.
   Simple, but silver hardly reads as a colour, and the reds compete with black and white and can look
   like an error or a clearance sale.
2. **Silver with a warm accent (chosen):** silver with amber, red or orange. Silver gives the glow and
   the warm colour marks only what must stand out.

## Decision

Thales chose silver with amber on 2026-11-07, and may change it later.

- **Silver (`--sheen`, #c9ced6):** the barbed wire graphic and the soft glow behind it.
- **Amber (`--highlight`, #f2b01e, with black text):** the sale badge and thin accent lines.
- Buttons, text, prices and grounds stay black, white and grey.

## Consequences

- Neither colour reaches 4.5:1 on white (silver 1.6:1, amber 1.9:1), so neither is used as text on the
  store ground. `tests/design/contrast.test.ts` enforces it and keeps every other token grey.
- On black, silver reaches 12.3:1 and amber 10.2:1.
- `ProductCard` uses amber for the badge of a product on sale. Other badges stay black.
- The wire graphic and the thin lines arrive with the home page (FE-11.1).
- Changing the colours later takes the two palette values and the ratios in this record.
