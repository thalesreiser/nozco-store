# Development plan

Work breakdown: **epics → tasks → sub-tasks**. Each task is one Trello card (pt-BR) and, when it
changes the repository, one pull request. Estimates are in hours of focused work.

**Release cut:** the launch (go-live, task 8.6) needs every **M** task. **S** tasks may ship
right after launch; **C** tasks are backlog.

| Epic | Name | Tasks | Estimate |
|---|---|---|---|
| E1 | Foundation | 1.1 – 1.6 | 20 h |
| E2 | Visual identity and design system | 2.1 – 2.4 | 16 h |
| E3 | Catalog | 3.1 – 3.7 | 28 h |
| E4 | Cart and shipping | 4.1 – 4.4 | 15 h |
| E5 | Checkout and payments | 5.1 – 5.6 | 28 h |
| E6 | Back office | 6.1 – 6.6 | 30 h |
| E7 | Post-sale and customer | 7.1 – 7.7 | 20 h |
| E8 | Legal, quality and launch | 8.1 – 8.6 | 20 h |
| | **Total** | **46 tasks** | **177 h** |

## Process
- **Definition of Ready:** requirement and acceptance criterion written, dependencies done (tasks
  and open questions), estimate set. Only ready cards go to *Pronto*.
- **Definition of Done:** the checklist in the PR template (lint, type-check, tests, docs,
  traceability, no secrets) plus the card's sub-tasks ticked.
- **Flow:** Backlog → Pronto → Em andamento → Revisão (PR open) → Concluído (merged).
- Every card gets dated comments at start, PR opened and completion.
- Decisions with lasting impact get an ADR in `docs/adr/`; business decisions close an item in
  [03 - Open questions](03-open-questions.md).

## E1 - Foundation
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 1.1 | Vision, requirements and development plan | — | M | 4 h | — |
| 1.2 | Architecture and stack ADRs | RNF-02, RNF-09 | M | 4 h | 1.1, Q-02 |
| 1.3 | Project scaffold | RNF-09 | M | 4 h | 1.2 |
| 1.4 | CI and repository security | RNF-02, RNF-09 | M | 3 h | 1.3 |
| 1.5 | Environments and infrastructure | RNF-02, RNF-05 | M | 3 h | 1.2 |
| 1.6 | Business accounts and domain (manual) | RST-01 | M | 2 h | — |

- **1.1** vision and scope · requirements (MoSCoW) and risks · open questions · development plan · Trello board
- **1.2** ADR framework (Next.js App Router + TypeScript) · ADR database and ORM (PostgreSQL + Drizzle) · ADR payments (Mercado Pago Checkout Pro vs. transparent checkout vs. other gateways) · ADR shipping (Melhor Envio) · ADR hosting (commercial terms, cost, region) · ADR images and e-mail providers · `docs/04-architecture.md` with a context diagram
- **1.3** Next.js + TypeScript strict · ESLint + Prettier · Vitest · Playwright · npm scripts · `.env.example` with schema validation of environment variables
- **1.4** CI workflow (lint, type-check, unit tests, build, e2e) · gitleaks · Dependabot · `SECURITY.md` · merge checklist (private repos on the free plan have no branch protection)
- **1.5** development and production databases · hosting project with preview deploys · secrets in the host's encrypted variables · migrations applied by the pipeline · automatic backups
- **1.6** register `nozco.com.br` (registro.br) · Mercado Pago business account and test credentials · Melhor Envio account · e-mail on the domain (SPF, DKIM, DMARC) · company data (Q-11)

## E2 - Visual identity and design system
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 2.1 | Brand guide | — | M | 3 h | Q-12 |
| 2.2 | Design tokens and base components | RNF-06 | M | 5 h | 1.3, 2.1 |
| 2.3 | Global layout (header, footer, consent) | RF-20, RNF-04 | M | 5 h | 2.2 |
| 2.4 | Wireframes of key pages | — | M | 3 h | 2.1 |

- **2.1** logo variants (SVG, light/dark) · palette (black, white, greys) · typography (urban display + readable body) · imagery and tone of voice · favicon and Open Graph image
- **2.2** tokens (colour, spacing, type scale) with WCAG AA contrast check · Button, Input, Select, Badge, Price, ProductCard · focus and disabled states · component tests
- **2.3** announcement bar · header with category menu, search and cart · mobile menu · footer with legal data, payment methods and social links · floating WhatsApp button · cookie consent banner
- **2.4** home, listing, product, cart, checkout and tracking (mobile first) · review with the brand owner

## E3 - Catalog
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 3.1 | Catalog data model | RN-01 | M | 4 h | 1.5, Q-03 |
| 3.2 | Images and initial catalog | RF-15 | M | 3 h | 3.1, Q-08, Q-09 |
| 3.3 | Home page | RF-01 | M | 4 h | 2.3, 3.1 |
| 3.4 | Listing page | RF-02 | M | 5 h | 3.3 |
| 3.5 | Product page | RF-03 | M | 6 h | 2.2, 3.1 |
| 3.6 | Search | RF-04 | S | 3 h | 3.4 |
| 3.7 | SEO and performance | RNF-01, RNF-07 | M | 3 h | 3.5 |

- **3.1** entities (product, variant, SKU, stock, category, collection, image) · money in integer cents · migrations · ADR on the model · seed data
- **3.2** image storage and upload · responsive images · alt text · import of the initial products
- **3.3** banner carousel · value-proposition strip · featured collections · product grid · product card (compare-at price, % off badge, installments)
- **3.4** category and collection routes · sorting · filters (size, colour, price) · pagination · state in the URL · empty states
- **3.5** gallery · size/colour selector with availability · size guide · price and installments · fabric and care · add to cart · related products
- **3.6** PostgreSQL full-text search · results page · no-results state
- **3.7** metadata and Open Graph · sitemap and robots · schema.org `Product`/`Offer` · canonical URLs · Lighthouse budget in CI

## E4 - Cart and shipping
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 4.1 | Cart | RF-05 | M | 5 h | 3.5 |
| 4.2 | Shipping quote | RF-06 | M | 5 h | 4.1, 1.6, Q-10 |
| 4.3 | Coupons | RF-07 | S | 3 h | 4.1 |
| 4.4 | Shipping promotions | RF-07 | S | 2 h | 4.2, Q-06 |

- **4.1** server-side cart keyed by cookie · add, update, remove · cap at available stock · mini-cart drawer · totals · unit and e2e tests
- **4.2** Melhor Envio client · package dimensions and weight per product · quote on product page and cart · cache, timeout and fallback · tests with mocks
- **4.3** coupon model · rules (validity, usage limit, minimum value) · apply/remove in cart · tests
- **4.4** free-shipping threshold · "R$ X left for free shipping" progress bar

## E5 - Checkout and payments
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 5.1 | Checkout flow | RF-08, RNF-04 | M | 6 h | 4.2 |
| 5.2 | Order model and state machine | RN-03, RNF-05 | M | 4 h | 3.1 |
| 5.3 | Mercado Pago integration | RF-09, RN-02 | M | 6 h | 5.1, 5.2, 1.6, Q-05 |
| 5.4 | Payment webhook and reconciliation | RF-10, RNF-02, RNF-05 | M | 6 h | 5.3, Q-04 |
| 5.5 | Transactional e-mails | RF-11 | M | 3 h | 5.2, 1.6 |
| 5.6 | Checkout end-to-end tests | RNF-09 | M | 3 h | 5.4 |

- **5.1** contact and CPF (validated) · address with ViaCEP auto-fill · shipping choice · order review · LGPD notice
- **5.2** order and items with price snapshot · states (`pending`, `paid`, `picking`, `shipped`, `delivered`, `cancelled`, `refunded`) and allowed transitions · transactional stock reservation · concurrency tests
- **5.3** ADR on the integration · payment preference creation · Pix, card up to 6x interest-free and boleto · return pages (approved, pending, rejected) · sandbox tests
- **5.4** signature validation · idempotency · status mapping · stock commit/release · expiry job for unpaid reservations · reconciliation job against Mercado Pago · failure alerts
- **5.5** e-mail provider · brand templates · triggers per order event · tests
- **5.6** Playwright purchase in the sandbox (Pix, approved card, rejected card) · CI job

## E6 - Back office
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 6.1 | Admin authentication and roles | RF-14, RNF-03 | M | 5 h | 1.5, Q-07 |
| 6.2 | Catalog management | RF-15 | M | 6 h | 6.1, 3.1 |
| 6.3 | Order management and shipping labels | RF-16 | M | 6 h | 6.1, 5.4, 4.2 |
| 6.4 | Exchanges, returns and refunds | RF-17 | S | 5 h | 6.3, 7.2 |
| 6.5 | Dashboard and stock alerts | RF-21 | S | 4 h | 6.3 |
| 6.6 | Invoices (NF-e) | RF-18 | M | 4 h | 5.4, Q-01 |

- **6.1** login · TOTP 2FA · roles (admin, operator) · login rate limit · audit log
- **6.2** products and variants CRUD · stock adjustments with reason · image upload · categories, collections and banners
- **6.3** order list with filters · order detail and notes · buy label on Melhor Envio · print label · tracking code saved and e-mailed
- **6.4** request queue · reverse-logistics code · refund via Mercado Pago · restock
- **6.5** sales KPIs · best sellers · low-stock threshold per variant and alert
- **6.6** decide the approach with the accountant (Q-01) · integration or documented manual process · store invoice key/link on the order · send invoice to the customer

## E7 - Post-sale and customer
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 7.1 | Order tracking page | RF-12 | M | 3 h | 5.2, 6.3 |
| 7.2 | Exchange/return request | RF-13, RN-04 | M | 4 h | 7.1 |
| 7.3 | Newsletter with consent | RF-19, RNF-04 | S | 2 h | 2.3 |
| 7.4 | Customer account | RF-22 | C | 4 h | 5.2 |
| 7.5 | Institutional pages (FAQ, About, contact) | RF-20 | S | 2 h | 2.3 |
| 7.6 | Product reviews | RF-23 | C | 3 h | 7.1 |
| 7.7 | Abandoned-cart e-mail | RF-24 | C | 2 h | 5.5 |

- **7.1** lookup by order number + e-mail · status history · carrier tracking link
- **7.2** request form · rules (7-day withdrawal, size-exchange window) · policy text · operator notification
- **7.3** sign-up form with consent record · double opt-in · unsubscribe · export
- **7.4** passwordless login (e-mail link) · order history · saved addresses
- **7.5** FAQ · About the brand · contact
- **7.6** review after delivery · moderation · rating on product page
- **7.7** consent check · one reminder per cart · unsubscribe link

## E8 - Legal, quality and launch
| ID | Task | Req. | Prio. | Est. | Depends on |
|---|---|---|---|---|---|
| 8.1 | Legal pages | RST-01, RNF-04 | M | 3 h | Q-11 |
| 8.2 | Security review | RNF-02, RNF-03 | M | 4 h | 5.4, 6.1 |
| 8.3 | Accessibility and performance audit | RNF-01, RNF-06 | M | 3 h | 5.1 |
| 8.4 | Analytics and monitoring | RNF-08 | M | 3 h | 2.3 |
| 8.5 | Production setup | RNF-05 | M | 3 h | 1.5, 1.6 |
| 8.6 | Go-live | — | M | 4 h | all M tasks |

- **8.1** terms of use · privacy policy (LGPD) · exchange and return policy · cookie policy · legal footer data · review by a lawyer/accountant
- **8.2** OWASP ASVS L1 checklist · security headers (CSP, HSTS) · rate limits · dependency audit · secrets review · no PII in logs
- **8.3** axe on key pages · keyboard navigation · Lighthouse · fixes
- **8.4** analytics only after consent · error tracking · uptime monitoring · payment/webhook alerts
- **8.5** DNS and HTTPS on `nozco.com.br` · production variables · Mercado Pago production credentials · backup restore test
- **8.6** real purchase with Pix and card, then refund · launch checklist · operator runbook · first week of close monitoring
