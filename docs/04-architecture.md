# 04 - Architecture

The store is a Nuxt 4 storefront in front of a Medusa v2 backend, in one monorepo. Decisions are in
[ADR 001](adr/001-nuxt-medusa-stack.md) and [ADR 002](adr/002-mercado-pago-on-site-payment.md).

## Components

```mermaid
flowchart LR
  customer([Customer]) --> nuxt[Nuxt 4 on Cloudflare]
  operator([Operator]) --> admin[Medusa Admin]
  nuxt -->|Store API, catalog| api[Medusa API on Railway]
  nuxt -->|Nitro server routes: login, checkout| api
  customer -->|card tokenised in the browser| mp[Mercado Pago]
  admin --> api
  api --> pg[(PostgreSQL)]
  api --> redis[(Redis)]
  worker[Medusa worker] --> pg
  worker --> redis
  api --> mp
  mp -->|webhook| api
  api --> me[Melhor Envio]
  me -->|webhook| api
  worker --> resend[Resend]
  worker --> nfe[NF-e, Q-01]
  api --> r2[(Cloudflare R2)]
  nuxt -->|images| r2
```

## Repository structure

```
nozco-store/
├─ apps/
│  ├─ backend/              # Medusa v2
│  │  ├─ src/
│  │  │  ├─ api/            # custom routes (store/, admin/, hooks/)
│  │  │  ├─ modules/        # content, invoice
│  │  │  ├─ providers/      # mercadopago, melhorenvio, resend
│  │  │  ├─ workflows/      # checkout, fulfillment, refund
│  │  │  ├─ subscribers/    # order and payment events
│  │  │  ├─ jobs/           # reconciliation and other scheduled jobs
│  │  │  ├─ links/          # module links (order to invoice)
│  │  │  └─ admin/          # Medusa Admin extensions
│  │  └─ integration-tests/
│  └─ storefront/           # Nuxt 4
│     ├─ app/               # pages, layouts, components, composables, stores
│     ├─ content/           # institutional pages in Markdown
│     ├─ i18n/locales/      # pt-BR.json
│     ├─ server/api/        # BFF routes
│     ├─ shared/            # schemas used by app and server
│     └─ tests/
├─ packages/
│  ├─ shared-types/         # types and Zod schemas used by both apps
│  └─ eslint-config/
├─ infra/                   # docker-compose, Dockerfile
└─ .github/workflows/
```

## Payment and order sequence

```mermaid
sequenceDiagram
  autonumber
  actor C as Customer
  participant S as Nuxt
  participant M as Medusa API
  participant ME as Melhor Envio
  participant MP as Mercado Pago
  participant W as Medusa worker
  C->>S: Fills in contact, CPF and address
  S->>M: Updates cart through server route
  M->>ME: Quotes shipping
  ME-->>M: Carrier options
  M-->>S: Options
  C->>S: Chooses shipping and Pix
  S->>M: Starts payment
  M->>MP: Creates Pix charge
  MP-->>M: QR code and copy-paste
  M-->>S: QR code
  C->>MP: Pays in the bank app
  MP->>M: Webhook, payment approved
  M->>M: Completes cart, creates order
  S->>M: Polls status every 3 s
  M-->>S: Order confirmed
  M-)W: order.placed
  W->>C: Confirmation e-mail
```

The QR code alone confirms nothing: the order exists only after the webhook. The rule for an approved
payment with no stock left is pending in Q-04.

## Order states

```mermaid
stateDiagram-v2
  [*] --> paid: webhook approved
  paid --> picking
  picking --> shipped: label bought
  shipped --> delivered
  paid --> cancelled
  picking --> cancelled
  delivered --> return_requested: within the window
  return_requested --> refunded
  return_requested --> delivered: exchange completed or request denied
  cancelled --> refunded
  refunded --> [*]
```

## Environments

| Environment | Storefront | Backend | Trigger |
|---|---|---|---|
| Local | `nuxt dev`, mock or api source | Medusa with Postgres and Redis, when available | Manual |
| Preview | Cloudflare preview per PR | Staging API, or mock source | Pull request |
| Staging | Cloudflare | Railway, sandbox credentials | Merge to `develop` |
| Production | `nozco.com.br` | Railway, production credentials | Tag on `main` |

The branch names above take effect in EST-01.3, which adopts `develop` and `main` as in the tabacaria.
