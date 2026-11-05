# Development plan

Work breakdown in three tracks: **structural (EST), backend (BE) and frontend (FE)**. Each task is
one Trello card (pt-BR) and, when it changes the repository, one pull request. Estimates are in
hours of focused work. Decisions are in [ADR 001](adr/001-nuxt-medusa-stack.md) and
[ADR 002](adr/002-mercado-pago-on-site-payment.md); pending ones in
[03 - Open questions](03-open-questions.md).

**Release cut:** the go-live (EST-05.4) needs every **M** task. **S** tasks may ship right after
launch; **C** tasks are backlog.

| Track | Tasks | Total | Needed for launch (M) |
|---|---|---|---|
| Structural | 16 | 49 h | 49 h |
| Backend (Medusa v2) | 28 | 94 h | 84 h |
| Frontend (Nuxt 4) | 32 | 119 h | 108 h |
| Post-launch backlog | 2 | 5 h | 0 h |
| **Total** | **78** | **267 h** | **241 h** |

## Process
- **Definition of Ready:** requirement and acceptance criterion written, dependencies done (tasks,
  questions and decisions), estimate set. Only ready cards go to *Pronto*.
- **Definition of Done:** the PR template checklist plus the card's sub-tasks ticked.
- **Flow:** Backlog → Pronto → Em andamento → Revisão (PR open) → Concluído (merged).
- **Interface first:** tasks ending in `a` build the screen on fictional mock data and are the design
  review; tasks ending in `b` connect the real API without changing the composable signature. E2E
  tests can run on the mock source without a backend.
- **Who decides:** design, UI, UX, data model breaks, API contract breaks, business rules, security,
  infrastructure and cost go to Thales with options and a recommendation, and end in an ADR. Routine
  implementation choices are listed in the PR.
- Every card gets dated comments at start, PR opened and completion.

## Suggested order
1. **Foundation:** EST-01.3, EST-01.4, FE-01.1, BE-01.1, EST-02.1, EST-03.1.
2. **Look and feel:** FE-12.2, FE-12.3, FE-01.2, FE-12.1, FE-11.3. Decisions DEC-01, DEC-02, DEC-06 and DEC-07 happen here.
3. **Screens on mock data:** FE-02.1, FE-11.1, FE-04.1a, FE-04.2a, FE-05.1a. The store can be reviewed on a preview link from this point.
4. **Real catalog and cart:** BE-01.2, BE-02.x, BE-04.1, then the `b` tasks.
5. **Paying and shipping:** BE-03.1, BE-05.x, BE-06.x, BE-07.x, FE-02.2, FE-05.2, FE-06.x, FE-07.x.
6. **Launch:** BE-08.1, BE-09.1, FE-08.x, FE-09.x, EST-05.x.

## Structural

### EST-01 - Repository foundation (13 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| EST-01.1 | Vision, requirements and development plan | — | M | 4 h | — |
| EST-01.2 | Replan for Nuxt 4 + Medusa v2 | RNF-09 | M | 3 h | EST-01.1 |
| EST-01.3 | Monorepo and tooling | RNF-09 | M | 4 h | EST-01.2 |
| EST-01.4 | Contributor rules and templates | RNF-09 | M | 2 h | EST-01.3 |

- **EST-01.1** Vision and scope · Requirements and risks · Open questions · Plan and Trello board
- **EST-01.2** ADRs for stack and payment · Requirements adapted · Architecture and frontend standards docs · Plan with EST, BE and FE tracks · Trello board rebuilt
- **EST-01.3** pnpm workspaces and Turborepo · Node 24 pinned (.nvmrc, engines) · Strict TypeScript base config · ESLint and Prettier · Husky, lint-staged and commitlint · packages/shared-types and packages/eslint-config
- **EST-01.4** Root and per-app CLAUDE.md · ADR template with options considered · Updated PR template · CODEOWNERS and Dependabot · Fictional-data rule for fixtures

### EST-02 - Local environment (2 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| EST-02.1 | Local services | RST-02 | M | 2 h | EST-01.3 |

- **EST-02.1** docker-compose with Postgres 15 and Redis 7 · Env examples for both apps · README with and without Docker

### EST-03 - CI and security (9 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| EST-03.1 | CI pipeline | RNF-09 | M | 4 h | BE-01.1, FE-01.1 |
| EST-03.2 | Security automation | RNF-02 | M | 2 h | EST-03.1 |
| EST-03.3 | Backend container image | RNF-02, RNF-05 | M | 3 h | BE-01.1, EST-03.1 |

- **EST-03.1** Quality job (lint, typecheck, format, unit tests) · Build job with Turborepo cache · Backend integration job with Postgres and Redis services · Storefront e2e job on mock data · CI jobs as required checks on `develop` and `main`
- **EST-03.2** gitleaks in CI · Dependency audit (high and above) · SECURITY.md · CodeQL
- **EST-03.3** Multi-stage Dockerfile · Non-root runtime · Image scan in CI

### EST-04 - Infrastructure and accounts (11 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| EST-04.1 | Business accounts and domain (manual) | RST-01 | M | 2 h | — |
| EST-04.2 | Railway staging | RNF-05 | M | 4 h | EST-03.3, EST-04.1, Q-02 |
| EST-04.3 | DNS and object storage | RNF-01 | M | 2 h | EST-04.1 |
| EST-04.4 | Backend observability | RNF-08 | M | 3 h | EST-04.2 |

- **EST-04.1** Register nozco.com.br · Mercado Pago business account and test credentials · Melhor Envio account · E-mail on the domain (SPF, DKIM, DMARC) · Cloudflare and Railway accounts · Company data (Q-11)
- **EST-04.2** API and worker services · Managed Postgres and Redis · Encrypted variables per environment · Migrations in the deploy pipeline · Automatic backups
- **EST-04.3** DNS on Cloudflare · R2 bucket and CDN domain · Scoped access keys
- **EST-04.4** Sentry on API and worker · JSON logs without PII · Uptime monitoring · Payment and webhook failure alerts

### EST-05 - Launch (14 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| EST-05.1 | Legal texts (manual) | RST-01, RNF-04 | M | 3 h | Q-11 |
| EST-05.2 | Security review | RNF-02, RNF-03 | M | 4 h | BE-05.2, BE-10.2, FE-06.3 |
| EST-05.3 | Production setup | RNF-05 | M | 3 h | EST-04.2, FE-10.1 |
| EST-05.4 | Go-live | — | M | 4 h | all M tasks |

- **EST-05.1** Terms of use · Privacy policy (LGPD) · Exchange and return policy · Cookie policy · Legal review
- **EST-05.2** OWASP ASVS L1 checklist · Headers and CSP review, including the Mercado Pago SDK · Secrets and dependency review · PII in logs and analytics
- **EST-05.3** Production environment · DNS and HTTPS on nozco.com.br · Mercado Pago and Melhor Envio production credentials · Backup restore test
- **EST-05.4** Real purchase with Pix and card, then refund · Launch checklist · Operator runbook · First week of close monitoring

## Backend (Medusa v2)

### BE-01 - Medusa setup (8 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-01.1 | Medusa scaffold | RNF-09 | M | 3 h | EST-01.3 |
| BE-01.2 | Store setup | RN-01 | M | 3 h | BE-01.1 |
| BE-01.3 | Admin access spike | RF-14, RNF-03 | M | 2 h | BE-01.1, Q-07 |

- **BE-01.1** Medusa v2 from the official starter, without demo seed · Zod validation of environment variables · Server and worker modes · Health route
- **BE-01.2** Brazil region in BRL · loja-online sales channel and publishable key · Stock location · Idempotent script and integration test
- **BE-01.3** Check 2FA and role support in the current Medusa version · Options: extension, proxy-level access control or reduced requirement · ADR with the decision

### BE-02 - Apparel catalog (15 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-02.1 | Apparel product model | RF-03, RF-15, RN-01 | M | 3 h | BE-01.2, Q-03 |
| BE-02.2 | Image storage | RF-15, RNF-01 | M | 2 h | BE-01.1, EST-04.3 |
| BE-02.3 | Catalog seed and import | RF-15 | M | 2 h | BE-02.1, Q-08, Q-09 |
| BE-02.4 | Store API for listing and search | RF-02, RF-04 | M | 5 h | BE-02.1 |
| BE-02.5 | Home content | RF-01, RF-15 | M | 3 h | BE-01.1, DEC-06 |

- **BE-02.1** Size and colour options; one variant and SKU per combination · Stock per variant · Compare-at price through price lists · Categories and collections · Fabric, care, weight and dimensions as typed metadata · ADR on the model
- **BE-02.2** S3 file module pointing at R2 · Upload from the admin · Images per colour
- **BE-02.3** Fictional development seed · Spreadsheet import of the real catalog
- **BE-02.4** Map what the standard Store API already covers · Custom routes for size and colour filters and facets · Best-seller and on-sale sorting · Availability per variant · Text search
- **BE-02.5** Content module for banners and announcement bar · Admin screen · Store API route

### BE-03 - Customers and LGPD (8 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-03.1 | Customer data and CPF | RF-08, RNF-04 | M | 3 h | BE-01.2 |
| BE-03.2 | Customer authentication | RF-22 | S | 2 h | BE-03.1, DEC-05 |
| BE-03.3 | LGPD requests | RNF-04 | M | 3 h | BE-03.1 |

- **BE-03.1** CPF field and check-digit validation · Shared Zod schema · Masking in logs and admin
- **BE-03.2** E-mail and password · Password reset by e-mail · Login rate limit
- **BE-03.3** Data export · Anonymisation that keeps fiscal records · Request log

### BE-04 - Cart and promotions (4 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-04.1 | Cart rules | RF-05 | M | 2 h | BE-02.1 |
| BE-04.2 | Coupons and free shipping | RF-07 | S | 2 h | BE-04.1, Q-06 |

- **BE-04.1** Stock validation by variant · Typed errors · Integration tests
- **BE-04.2** Promotion module configuration · Validity and usage limits · Free-shipping rule

### BE-05 - Payments (20 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-05.1 | Mercado Pago provider and Pix | RF-09 | M | 5 h | BE-01.2, EST-04.1, DEC-09 |
| BE-05.2 | Payment webhook | RF-10, RNF-02 | M | 5 h | BE-05.1 |
| BE-05.3 | Card, boleto and refunds | RF-09, RN-02 | M | 6 h | BE-05.2, Q-05 |
| BE-05.4 | Last-unit race and reconciliation | RN-03, RNF-05 | M | 4 h | BE-05.2, Q-04 |

- **BE-05.1** Own provider with the official SDK · Pix charge with expiry · Status mapping · Unit tests with a mocked client
- **BE-05.2** x-signature validation · Deduplication and idempotency · Fetch the payment from the API before applying · Cart completion creates the order
- **BE-05.3** Card token flow and pending states · Up to 6x interest-free with minimum installment · Boleto with CPF and address · Full and partial refunds
- **BE-05.4** Spike: Medusa reservation timing versus order creation after payment · Rule for an approved payment with no stock left (Q-04) · Concurrency tests · Reconciliation job against Mercado Pago

### BE-06 - Shipping (9 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-06.1 | Melhor Envio quote | RF-06 | M | 5 h | BE-02.1, EST-04.1, Q-10 |
| BE-06.2 | Labels and tracking | RF-16 | M | 4 h | BE-06.1, BE-07.1 |

- **BE-06.1** Fulfillment provider · Package weight and dimensions by variant quantity · Cache, timeout and fallback · Tests with MSW
- **BE-06.2** Buy and print label · Save tracking code · Delivery status updates

### BE-07 - Orders and post-sale (13 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-07.1 | Order states | RF-16, RNF-05 | M | 3 h | BE-05.2 |
| BE-07.2 | Exchanges and returns | RF-13, RF-17, RN-04 | M | 4 h | BE-07.1, BE-05.3 |
| BE-07.3 | Guest order lookup | RF-12 | M | 2 h | BE-07.1 |
| BE-07.4 | Admin extensions | RF-16, RF-21 | S | 4 h | BE-06.2 |

- **BE-07.1** Picking, shipped and delivered states on top of Medusa · Allowed transitions · Subscribers per event
- **BE-07.2** Medusa returns and exchanges · 7-day withdrawal rule · First free size exchange · Refund and restock
- **BE-07.3** Lookup by number and e-mail · Signed token in e-mail links · Rate limit
- **BE-07.4** Label action on the order screen · Low-stock threshold and alert · Sales indicators

### BE-08 - Invoices (5 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-08.1 | Invoices (NF-e) | RF-18 | M | 5 h | BE-07.1, Q-01 |

- **BE-08.1** Invoice module linked to the order · Integration or documented manual process (Q-01) · Key and DANFE on the order · Retry on failure

### BE-09 - Notifications (6 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-09.1 | Transactional e-mails | RF-11 | M | 4 h | BE-07.1, EST-04.1 |
| BE-09.2 | Newsletter | RF-19, RNF-04 | S | 2 h | BE-09.1 |

- **BE-09.1** Resend provider · Templates with the brand · Triggers per order event
- **BE-09.2** Consent record · Double opt-in · Unsubscribe

### BE-10 - API contract and hardening (6 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BE-10.1 | API contract | RNF-09 | M | 3 h | BE-02.4 |
| BE-10.2 | API hardening | RNF-02 | M | 3 h | BE-01.1 |

- **BE-10.1** Types and Zod schemas in shared-types · Contract document for custom routes · Contract tests
- **BE-10.2** CORS per environment · Rate limits on sensitive routes · Payload validation on custom routes

## Frontend (Nuxt 4)

### FE-01 - Storefront setup (8 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-01.1 | Nuxt 4 scaffold | RNF-09 | M | 4 h | EST-01.3 |
| FE-01.2 | Design tokens | RNF-06 | M | 4 h | FE-01.1, FE-12.2, DEC-01 |

- **FE-01.1** Nuxt 4 with strict TypeScript · Tailwind 4 and shadcn-vue on Reka UI · Pinia, i18n and nuxt-security · Runtime config validated by Zod · Vitest, Testing Library, Playwright and axe
- **FE-01.2** Colour, type, spacing, radius and shadow tokens · Brand fonts self-hosted · Contrast check for every text pair · Ban on raw colours in components

### FE-02 - Data layer (8 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-02.1 | Typed composables and mock source | RNF-09 | M | 4 h | FE-01.1 |
| FE-02.2 | Server routes (BFF) | RNF-02 | M | 4 h | FE-02.1, BE-01.2 |

- **FE-02.1** useProducts, useCart and useCheckout signatures · mock and api data sources · Fictional apparel fixtures outside the production build · Medusa JS SDK client
- **FE-02.2** /api/auth, /api/checkout and /api/orders routes · httpOnly cookie · Zod validation and { code, message } errors · Cloudflare-compatible APIs only

### FE-03 - Authentication (4 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-03.1 | Sign-in pages | RF-22 | S | 4 h | FE-02.2, BE-03.2, DEC-05 |

- **FE-03.1** Sign in, sign up and password reset · VeeValidate and Zod forms · Route middleware for the account area

### FE-04 - Catalog pages (22 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-04.1a | Listing: interface | RF-02 | M | 5 h | FE-02.1, FE-12.1, DEC-07 |
| FE-04.1b | Listing: integration | RF-02 | M | 2 h | FE-04.1a, BE-02.4 |
| FE-04.2a | Product page: interface | RF-03 | M | 7 h | FE-02.1, FE-12.1 |
| FE-04.2b | Product page: integration | RF-03 | M | 2 h | FE-04.2a, BE-02.4 |
| FE-04.3 | Search | RF-04 | S | 3 h | FE-04.1b |
| FE-04.4 | Catalog SEO | RNF-07 | M | 3 h | FE-04.2b |

- **FE-04.1a** Category and collection routes · Size, colour and price filters; mobile filter drawer · Sorting and pagination · State in the URL · Loading, empty, error and content states
- **FE-04.1b** api source in the composable · routeRules with 10 min SWR
- **FE-04.2a** Gallery with swipe and zoom, by colour · Size and colour selector with availability · Size guide dialog · Price, compare-at and installments · Fabric and care · Sticky add-to-cart on mobile · Related products
- **FE-04.2b** api source and SSR · Fresh stock check on the client
- **FE-04.3** Header search field · Results page · No-results state
- **FE-04.4** Meta tags and Open Graph · schema.org Product and Offer · Sitemap and robots · Canonical URLs for filters

### FE-05 - Cart (10 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-05.1a | Cart: interface | RF-05 | M | 4 h | FE-02.1, FE-12.1 |
| FE-05.1b | Cart: integration | RF-05 | M | 3 h | FE-05.1a, BE-04.1 |
| FE-05.2 | Shipping estimate and coupon | RF-06, RF-07 | M | 3 h | FE-05.1b, BE-06.1 |

- **FE-05.1a** Mini-cart drawer · Cart page · Quantity stepper with stock cap · Totals and empty state
- **FE-05.1b** cart_id cookie · Pinia store mirroring the API · Optimistic update with rollback
- **FE-05.2** CEP widget on product page and cart · Coupon field · Free-shipping progress bar

### FE-06 - Checkout (17 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-06.1 | Checkout: identification, address and shipping | RF-08, RNF-04 | M | 6 h | FE-05.2, FE-02.2, BE-03.1, DEC-03, DEC-05 |
| FE-06.2 | Checkout: Pix | RF-09 | M | 4 h | FE-06.1, BE-05.2 |
| FE-06.3 | Checkout: card and boleto | RF-09, RN-02 | M | 5 h | FE-06.2, BE-05.3 |
| FE-06.4 | Order confirmation | RF-11, RF-12 | M | 2 h | FE-06.2, BE-07.3 |

- **FE-06.1** Contact and CPF with masks · Address auto-filled by CEP · Shipping options · Order summary · LGPD notice
- **FE-06.2** QR Code and copy button · Expiry countdown · Status polling every 3 s · Expired-charge recovery
- **FE-06.3** Card tokenised by the Mercado Pago JS SDK · Installment selector · Boleto with digitable line · Payment error messages
- **FE-06.4** Confirmation page · Tokenised link · Next steps and tracking link

### FE-07 - Post-sale and account (10 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-07.1 | Order tracking page | RF-12 | M | 3 h | BE-07.3, FE-02.2 |
| FE-07.2 | Exchange and return request | RF-13, RN-04 | M | 3 h | FE-07.1, BE-07.2 |
| FE-07.3 | Customer area | RF-22, RNF-04 | S | 4 h | FE-03.1, BE-03.3 |

- **FE-07.1** Lookup form · Status history · Carrier link
- **FE-07.2** Request form · Deadline rules on screen · Confirmation
- **FE-07.3** Orders and order detail · Addresses · Privacy requests

### FE-08 - Consent and observability (4 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-08.1 | Consent and analytics | RNF-04, RNF-08 | M | 3 h | FE-11.3, DEC-04 |
| FE-08.2 | Frontend error tracking | RNF-08 | M | 1 h | FE-10.1 |

- **FE-08.1** Cookie banner and preferences · Purchase funnel events · Scripts only after consent
- **FE-08.2** @sentry/nuxt · PII scrubbing

### FE-09 - Frontend quality (8 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-09.1 | Purchase journey tests | RNF-06, RNF-09 | M | 5 h | FE-06.3 |
| FE-09.2 | Performance budget | RNF-01 | M | 3 h | FE-04.2b, FE-11.1 |

- **FE-09.1** Product-to-confirmation journey · Pix, approved card and rejected card · Mobile viewport · axe on every key page
- **FE-09.2** Lighthouse in CI · Bundle size check · Image sizes and formats · Keyboard navigation audit

### FE-10 - Storefront deployment (3 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-10.1 | Cloudflare deployment | RNF-01 | M | 3 h | FE-01.1, EST-04.1 |

- **FE-10.1** Nitro preset for Cloudflare · Preview per PR · Staging and production environments · Runtime variables

### FE-11 - Home, global layout and institutional pages (13 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-11.1 | Home page | RF-01 | M | 5 h | FE-11.3, FE-12.1, BE-02.5, DEC-06 |
| FE-11.2 | Institutional and error pages | RF-20, RST-01 | M | 3 h | FE-11.3, EST-05.1 |
| FE-11.3 | Global layout | RF-19, RF-20, RST-01 | M | 5 h | FE-12.1 |

- **FE-11.1** Hero and banners · Value-proposition strip · Featured collections · Product grid
- **FE-11.2** @nuxt/content pages · About, FAQ, contact, shipping, exchanges and legal texts · 404 and 500 pages
- **FE-11.3** Announcement bar · Header with category menu, search and cart · Mobile menu · Footer with legal data, payment methods and social links · WhatsApp button · Newsletter form

### FE-12 - Design system (12 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| FE-12.1 | Base components | RNF-06 | M | 6 h | FE-01.2, DEC-02 |
| FE-12.2 | Brand guide | — | M | 3 h | Q-12 |
| FE-12.3 | Key page mock-ups | — | M | 3 h | FE-12.2 |

- **FE-12.1** Price, Skeleton, EmptyState and ErrorState · QuantityStepper, StockBadge and ProductCard · SizeSelector and ColourSwatch · Focus, hover, disabled and error states · Internal /_componentes gallery · axe on each component
- **FE-12.2** Logo variants · Typography candidates · Black, white and grey palette with accent decision · Photo treatment and tone of voice
- **FE-12.3** Options for home, listing, product and checkout · Mobile first · Review and ADRs for DEC-02, DEC-03, DEC-06 and DEC-07

## Post-launch backlog

### BL-01 - After go-live (5 h)

| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| BL-01.1 | Product reviews | RF-23 | C | 3 h | go-live |
| BL-01.2 | Abandoned-cart e-mail | RF-24 | C | 2 h | go-live |

- **BL-01.1** Review after delivery · Moderation · Rating on the product page
- **BL-01.2** Consent check · One reminder per cart · Unsubscribe link
