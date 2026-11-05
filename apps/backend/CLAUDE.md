# Backend (Medusa v2)

Read the root `CLAUDE.md` first. Architecture is in `docs/04-architecture.md`; the payment decision is in
`docs/adr/002-mercado-pago-on-site-payment.md`.

## Layout

```
src/api/          custom routes (store/, admin/, hooks/)
src/modules/      custom modules (content, invoice)
src/providers/    payment (Mercado Pago), fulfillment (Melhor Envio), notification (Resend)
src/workflows/    checkout, fulfillment, refund
src/subscribers/  event handlers (order and payment events)
src/jobs/         scheduled jobs (reconciliation)
src/links/        module links (order to invoice)
src/admin/        Medusa Admin extensions
integration-tests/
```

## Rules

- Medusa is the single source of truth for products, prices, stock, carts and orders. Use its modules
  before writing custom ones.
- Money is stored in integer cents (BRL).
- Business rules (CPF validation, order state transitions, webhook signatures, exchange deadlines) live
  in pure functions with unit tests; workflows and routes call them.
- Every custom route validates input with the Zod schemas in `packages/shared-types` and returns errors
  as `{ code, message }`.
- Webhooks: validate the signature, fetch the resource from the provider before trusting the payload,
  process idempotently (the same event twice never creates two orders or moves stock twice).
- The order exists only after the payment webhook. A QR code or a pending charge confirms nothing.
- Slow work (NF-e, labels, e-mails) runs in the worker, never in the request.
- Logs are JSON and never contain CPF, address or card data. Card numbers never reach this server.
- Migrations stay compatible with the previous release (expand, then contract) so rollback works.
