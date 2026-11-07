# 002 - On-site payment with Mercado Pago

- **Status:** accepted on 2026-11-07 by Thales Reiser (DEC-09, [ADR 011](011-store-decisions-2026-11-07.md))
- **Date:** 2026-11-05

## Context

The first plan used Mercado Pago Checkout Pro, which sends the customer to a hosted page. The tabacaria
keeps the customer on the site: the Pix QR code is shown on the store's own screen and the card form is
part of the checkout. Medusa has no maintained Mercado Pago provider that covers Pix and boleto for
Brazil (tabacaria spike 0001, researched on 2026-10-31).

## Decision

Write an own Medusa payment provider with the official `mercadopago` SDK:

- **Pix:** QR code and copy-paste on the store's screen, expiry countdown, status polling every 3 s.
- **Card:** tokenised in the browser by the Mercado Pago JS SDK, up to 6x interest-free. The card number
  never reaches our servers.
- **Boleto:** digitable line on the store's screen.
- **Order:** created only after the webhook confirms the payment. The webhook validates `x-signature`,
  deduplicates and fetches the payment from the API before applying it.

## Alternatives considered

- **Checkout Pro (hosted):** least effort and the smallest PCI scope, but the customer leaves the site
  and the visual identity is lost at the moment of payment.
- **Community provider:** the Medusa v2 options found cover card only or are not for Brazil, so Pix, the
  main method, would have to be written anyway.

## Consequences

- More work than Checkout Pro: BE-05.1 to BE-05.4 and FE-06.2 to FE-06.3.
- The PCI scope is larger than with a hosted page. It is confirmed in the security review (EST-05.2),
  and the CSP must allow the Mercado Pago SDK.
- Because the order is created after payment, Medusa may not hold stock while a Pix is pending. Two
  customers can pay for the last unit, so BE-05.4 tests this and Q-04 defines what happens.
