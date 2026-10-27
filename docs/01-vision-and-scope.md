# 01 - Vision and scope

**Problem:** NozCo is a new streetwear brand that needs its own online store to sell t-shirts
directly to customers, with a visual identity inspired by urban art and full control over
catalog, stock and orders.

**Goal:** build and launch `nozco.com.br`, a fast and secure e-commerce site for t-shirts (later
other garments) with stock held by the brand, Brazilian payment methods and shipping across
Brazil, plus a back office to run day-to-day operations.

**Reference:** the information architecture of psywear.com.br was used as a benchmark for what a
Brazilian print t-shirt store offers: announcement bar, banners, value-proposition strip,
product grid with sorting, installments on the product card, tracking and exchange pages,
WhatsApp contact and a legal footer. Only the structure is a reference; brand, art, copy and
code belong to NozCo.

**Visual identity:** urban art and street culture; black, white and grey palette.

| In scope (v1) | Out of scope (v1) |
|---|---|
| Catalog with categories/collections, variants (size, colour) and stock | Marketplace integrations (Mercado Livre, Shopee) |
| Cart, shipping quote by CEP, coupons | Print-on-demand / dropshipping |
| Checkout with Pix, card (up to 6x interest-free) and boleto | Native mobile app |
| Transactional e-mails, order tracking, exchange/return requests | Loyalty programme, gift cards |
| Back office: products, stock, orders, shipping labels, exchanges | Multi-language / international shipping |
| Legal pages, LGPD consent, SEO, analytics | Physical store / POS |

## Success metrics (targets)
- First real order paid, shipped and delivered end to end in production
- Lighthouse mobile ≥ 90 (performance, accessibility, best practices, SEO) on home, listing and product pages
- Zero overselling (stock never goes negative), verified by concurrency tests
- Checkout conversion and cart abandonment measured from day one
- Monthly infrastructure cost within the agreed budget (Q-02)

## Stakeholders
| Role | Main interest |
|---|---|
| Customer | Find a shirt, pick size/colour, pay with Pix or card, receive it fast, exchange easily |
| Brand owner / operator | Register products, control stock, handle orders, exchanges and invoices with little effort |
| Thales (developer) | Maintainable, tested code, low running cost, safe handling of payments and personal data |
| Accountant | Sales records and invoices (NF-e) consistent with orders |
