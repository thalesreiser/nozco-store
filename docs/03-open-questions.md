# 03 - Open questions

Decisions that block or shape tasks. Each one is closed with an answer and a date and, when it changes
the architecture or the interface, an ADR.

## Business questions

| ID | Question | Blocks | Status |
|---|---|---|---|
| Q-01 | How will NF-e be issued: invoicing API/ERP (Focus NFe, Bling, Tiny, eNotas) or manually by the accountant? | BE-08.1 | Open |
| Q-02 | Monthly budget for infrastructure and services. The new stack needs API, worker, Postgres and Redis running all the time | EST-04.2 | Open |
| Q-03 | Garment types and size grid at launch (P–GG? XGG? oversized? babylook?) and fabric specs | BE-02.1 | Open |
| Q-04 | What happens when a payment is approved and the last unit has already been sold: automatic refund, or contact the customer and offer an exchange? For how long can a Pix stay open (30 min minimum)? And a boleto? | BE-05.4 | Open |
| Q-05 | Minimum installment value; do installments apply to every product? | BE-05.3 | Open |
| Q-06 | Free-shipping threshold or other promotions at launch | BE-04.2 | Open |
| Q-07 | Who runs the back office day to day, and with which roles? | BE-01.3 | Open |
| Q-08 | Product photos: who shoots them, format and number per product and colour | BE-02.3 | Open |
| Q-09 | Initial catalog size (number of designs and variants) | BE-02.3 | Open |
| Q-10 | Shipping origin address, package sizes and carriers to offer | BE-06.1 | Open |
| Q-11 | Company data for the legal footer (legal name, CNPJ, address, support e-mail/WhatsApp) | EST-05.1 | Open |
| Q-12 | Do logo files and brand fonts already exist, or are they part of FE-12.2? | FE-12.2 | Decided on 2026-11-07: [ADR 006](adr/006-logo.md) |

## Design, product and repository decisions

| ID | Decision | Recommendation | Blocks | Status |
|---|---|---|---|---|
| DEC-01 | Visual tokens: black, white and greys, with silver and amber for small details; Big Shoulders Display and Archivo | [ADR 005](adr/005-visual-direction.md), [ADR 010](adr/010-accent-colours.md) | FE-01.2 | Decided on 2026-11-06, amended on 2026-11-07 |
| DEC-02 | Base component style: mix D, brand of A with the store of B | [ADR 005](adr/005-visual-direction.md) | FE-12.1 | Decided on 2026-11-06 |
| DEC-03 | Checkout on a single page or in steps | Mock up both on mobile before choosing. | FE-06.1 | Open |
| DEC-04 | Analytics tool and advertising pixel. The tabacaria banned pixels because of tobacco ad rules; that reason does not apply to apparel | PostHog for the funnel, plus a Meta pixel behind consent only if paid ads are planned. | FE-08.1 | Open |
| DEC-05 | Guest checkout or account required | Guest checkout, with an optional account later. | BE-03.2, FE-03.1, FE-06.1 | Open |
| DEC-06 | Home blocks and their order | Option A: banner, value-proposition strip, new arrivals, collections ([ADR 008](adr/008-home-blocks.md)) | BE-02.5, FE-11.1 | Decided on 2026-11-07 |
| DEC-07 | Listing layout: filters in a sidebar or a top bar, and cards per row on mobile | Top bar on desktop, 2 cards per row on mobile, filters in a drawer on mobile ([ADR 009](adr/009-listing-layout.md)) | FE-04.1a | Decided on 2026-11-07 |
| DEC-08 | Repository visibility | Public with the proprietary licence ([ADR 003](adr/003-public-repository.md)) | EST-03.1 | Decided on 2026-11-05 |
| DEC-09 | Confirm on-site payment (ADR 002): card tokenised in the browser instead of the hosted Checkout Pro | Accept, as it matches the tabacaria experience. | BE-05.1 | Open |
