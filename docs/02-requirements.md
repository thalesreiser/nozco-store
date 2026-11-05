# 02 - Requirements (MoSCoW)

Priorities: **M** must, **S** should, **C** could, **W** won't (this version).

## Functional requirements
| ID | Requirement | Prio. | Acceptance criterion |
|---|---|---|---|
| RF-01 | Home page with announcement bar, banner carousel, value-proposition strip, featured collections and product grid | M | Given the home page, then banners, highlights and products load from the catalog |
| RF-02 | Product listing by category/collection with sorting (best sellers, newest, price, on sale), filters (size, colour, price) and pagination | M | Given a filter and a sort, then only matching products are shown in the chosen order |
| RF-03 | Product page with gallery, size/colour selector showing availability, size guide, price, compare-at price, installments and fabric details | M | Given an out-of-stock variant, then it cannot be added to the cart |
| RF-04 | Product search by name, category and tags | S | Given a term, then matching products are listed |
| RF-05 | Guest cart: add, change quantity, remove, persisted across visits | M | Given a quantity above stock, then the cart caps it and warns the customer |
| RF-06 | Shipping quote by CEP on product page and cart (Melhor Envio) | M | Given a valid CEP, then carrier options with price and delivery time are shown |
| RF-07 | Discount coupons (percentage, fixed value, free shipping; validity and usage limits) | S | Given an expired coupon, then it is rejected with a clear message |
| RF-08 | Checkout: contact, CPF, address with CEP auto-fill, shipping choice, order review | M | Given an invalid CPF, then checkout does not proceed |
| RF-09 | On-site payment with Pix (QR code and copy-paste), credit card (up to 6x interest-free) and boleto via Mercado Pago | M | Given an approved payment, then the order exists and is paid |
| RF-10 | Payment notifications (webhook) create the order and update stock idempotently | M | Given the same notification twice, then order and stock change only once |
| RF-11 | Transactional e-mails: order received, payment approved, shipped (tracking code), exchange updates | M | Given a shipped order, then the customer receives the tracking code by e-mail |
| RF-12 | Order tracking page by order number + e-mail | M | Given a valid pair, then status history and tracking link are shown |
| RF-13 | Exchange/return request (size exchange; right of withdrawal within 7 days, CDC art. 49) | M | Given a request within the window, then it is recorded and the operator is notified |
| RF-14 | Back office (Medusa Admin) login with 2FA and roles (admin, operator); the way to deliver this is decided after spike BE-01.3 | M | Given an operator, then they cannot change prices or users |
| RF-15 | Back office (Medusa Admin): products, variants, stock, images, categories, collections, banners | M | Given a stock change, then the storefront reflects it |
| RF-16 | Back office (Medusa Admin and extensions): orders (status, notes), shipping label purchase and tracking code via Melhor Envio | M | Given a paid order, then the operator can buy a label and the order becomes `shipped` |
| RF-17 | Back office: exchanges/returns and refunds via Mercado Pago | S | Given an approved return, then the refund is issued and stock is restocked |
| RF-18 | Invoice (NF-e) for each paid order | M | Given a paid order, then an NF-e is issued (integration or documented manual process, Q-01) |
| RF-19 | Newsletter sign-up with explicit LGPD consent | S | Given no consent, then the e-mail is not stored |
| RF-20 | WhatsApp button, FAQ, About and contact pages | S | Then every page links to WhatsApp and the FAQ |
| RF-21 | Sales dashboard and low-stock alerts | S | Given a variant below its threshold, then the operator is alerted |
| RF-22 | Customer account with order history | C | Given a logged-in customer, then past orders are listed |
| RF-23 | Product reviews | C | Given a delivered order, then the customer can review its products |
| RF-24 | Abandoned-cart e-mail | C | Given a consented customer who left checkout, then one reminder is sent |

## Non-functional requirements, rules and constraints
| ID | Type | Description |
|---|---|---|
| RNF-01 | Performance | LCP < 2.5 s, CLS < 0.1 and initial JS < 170 KB gzip on 4G mobile; Lighthouse ≥ 90 on key pages |
| RNF-02 | Security | Card numbers never reach our servers (tokenised in the browser by the Mercado Pago SDK; the resulting PCI scope is confirmed in EST-05.2); the customer token stays in an `httpOnly` cookie behind Nuxt server routes; webhook signatures validated; secrets only in the host's encrypted environment variables; OWASP ASVS L1 checklist; security headers (CSP, HSTS) |
| RNF-03 | Security | Back office with 2FA, rate-limited login and an audit log of sensitive changes |
| RNF-04 | Privacy (LGPD) | Privacy policy, consent before non-essential cookies, data minimisation, retention rules, data-subject request process |
| RNF-05 | Reliability | Stock never negative (transactional decrement, concurrency tests); idempotent webhooks; daily DB backups with a tested restore |
| RNF-06 | Accessibility | WCAG 2.1 AA on storefront and checkout (contrast is critical in a greyscale palette); keyboard navigation, visible focus and 44 x 44 px touch targets |
| RNF-07 | SEO | Server-rendered pages, sitemap, canonical URLs, Open Graph, schema.org `Product`/`Offer` |
| RNF-08 | Observability | Error tracking, structured logs without PII, uptime monitoring, alerts on payment/webhook failures |
| RNF-09 | Maintainability | TypeScript strict; types and Zod schemas shared by backend and storefront; ≥ 80% coverage on domain logic; e2e tests on cart and checkout; ADR for every relevant decision |
| RN-01 | Business rule | Money stored as integer cents (BRL); price shown with compare-at price and installments |
| RN-02 | Business rule | Up to 6x interest-free installments (minimum installment value: Q-05) |
| RN-03 | Business rule | The order is created only after the payment is approved, so the rule for an approved payment with no stock left is defined in Q-04 and tested in BE-05.4 |
| RN-04 | Business rule | First size exchange is free for the customer |
| RST-01 | Legal | Site shows legal name, CNPJ, address and contact (Decreto 7.962/2013); CDC and LGPD compliance |
| RST-02 | Constraint | Development laptop has no Docker and 7.7 GB of RAM; database and heavy checks run in GitHub Actions |

## Risks
| ID | Risk | Prob. | Impact | Mitigation |
|---|---|---|---|---|
| R-01 | Scope grows and launch slips | High | High | Strict MoSCoW; launch with every M item, S/C after go-live |
| R-02 | Overselling of the last unit while a Pix is pending | Med. | High | Spike and concurrency tests in BE-05.4; rule defined in Q-04 |
| R-03 | Payment/webhook failure leaves orders inconsistent | Med. | High | Idempotent handler, reconciliation job against Mercado Pago, alerts |
| R-04 | Personal-data leak (CPF, address) | Low | High | Minimal data, encryption in transit/at rest, least privilege, no PII in logs |
| R-05 | Low contrast in the greyscale identity hurts accessibility and conversion | Med. | Med. | Contrast-checked design tokens (FE-01.2) |
| R-06 | Tax/invoice obligations not ready at launch | Med. | High | Decide Q-01 with the accountant before BE-08.1 |
| R-07 | Monthly cost of API, worker, Postgres and Redis exceeds the budget | Med. | High | Answer Q-02 before EST-04.2 |
| R-08 | Medusa does not cover a requirement out of the box (2FA, roles, size and colour filters) | Med. | Med. | Spikes BE-01.3 and BE-02.4 before committing to the screens |
| R-09 | Business-sensitive data reaches the public repository | Low | High | Rules in `CLAUDE.md`, secret scanning with push protection, review on every PR ([ADR 003](adr/003-public-repository.md)) |
