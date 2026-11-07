# 011 - Store decisions of 2026-11-07

- **Status:** accepted
- **Date:** 2026-11-07
- **Decided by:** Thales Reiser
- **Reference:** DEC-03, DEC-04, DEC-05, DEC-09, BE-02.4, BE-02.5, BE-03.3, BE-04.1, FE-01.2, FE-11.3, FE-12.1

## Context

The pull requests of the first screens and backend tasks left design and business questions open, each
with options and a recommendation. Thales answered them together, after comparing drawings of each option.

## Options considered

The options and their trade-offs are in the pull requests named below. This record keeps the choices.

## Decision

### Checkout and payment

- **DEC-03:** checkout in steps, against the recommendation to see mock-ups first.
- **DEC-05:** guest checkout. An account stays optional.
- **DEC-09:** on-site payment, which accepts [ADR 002](002-mercado-pago-on-site-payment.md).
- **DEC-04:** PostHog, and a Meta pixel only when paid ads are planned. Both load after cookie consent.

### Store on a phone (#28)

- Only the logo row of the header is sticky, and the announcement stays on one line.
- A fixed WhatsApp button stays on screen.
- Search is an icon in the header.
- Legal data is required: a production start fails without it.
- Each collection has its own menu link, and the footer is black with the newsletter first.
- Newsletter: consent plus e-mail confirmation. The provider and the consent text remain open.

### Home (#31)

- A carousel appears only with two or more published banners. One image serves desktop and phones.

### Catalog (#26, #27)

- Size and colour filters match only variants in stock.
- Public stock is capped at 10.
- Colour shows a swatch with its name, so the catalog needs a colour value.
- "On sale" stays a sort by largest discount, and best sellers stay the last 90 days.

### Cart (#25)

- When stock falls below a cart line, the line stays, the cart warns, and checkout blocks it (BE-04.3).

### Privacy (#23)

- An operator approves each deletion.
- A refusal shows its reason to the customer. The legal wording still needs a lawyer's review.
- The export keeps the full CPF.

### Visual (#24)

- Status stays grey, with an icon and text.
- The display title is fluid and the page gutter is 16 px on phones.
- Overlays keep the soft shadow.

## Consequences

New tasks: BE-02.6 (stock-aware filters, stock cap and colour value), BE-03.6 (refusal reason), BE-04.3
(stock check before payment) and FE-11.4 (layout on a phone). The other choices match the code or wait for
tasks already planned: FE-06.1 for the steps, BE-03.2 and FE-03.1 for the optional account, BE-05.1 for
payment and the newsletter when its provider is chosen.
