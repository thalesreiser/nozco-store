# 001 - Nuxt 4 and Medusa v2 stack

- **Status:** accepted
- **Date:** 2026-11-05
- **Decided by:** Thales Reiser

## Context

The first plan proposed one Next.js application with PostgreSQL, Drizzle and a custom back office.
Thales asked to use technologies and UX/UI techniques similar to those of the other online store he
is building (`tabacaria-online`), so both stores share one way of working.

## Decision

| Layer | Choice |
|---|---|
| Repository | Monorepo with pnpm workspaces and Turborepo: `apps/backend`, `apps/storefront`, `packages/shared-types`, `packages/eslint-config` |
| Runtime and language | Node.js 24 LTS and strict TypeScript |
| Backend | Medusa v2 in server and worker modes, PostgreSQL 15, Redis 7 |
| Back office | Medusa Admin with extensions, replacing the custom back office |
| Storefront | Nuxt 4 (Vue 3 and Nitro) with SSR and route-level cache |
| Interface | Tailwind CSS 4, shadcn-vue on Reka UI, Pinia, VeeValidate with Zod, `@nuxt/image`, `@nuxt/content`, `@nuxtjs/i18n`, `nuxt-security` |
| Tests | Jest, `@medusajs/test-utils` and MSW on the backend; Vitest, Testing Library, Playwright and axe on the storefront |
| Providers | Mercado Pago, Melhor Envio, Resend |
| Hosting | Cloudflare for the storefront, DNS and R2 files; Railway for API, worker, Postgres and Redis |
| Observability | Sentry, JSON logs, Better Stack |

UX/UI techniques carried over are listed in [05 - Frontend standards](../05-frontend-standards.md).

### What does not carry over

| Tabacaria | NozCo | Why |
|---|---|---|
| Nuxt 3 and a later migration | Starts on Nuxt 4 | Nuxt 3 reached end of life on 2026-07-31 |
| Age gate, birth date check, `contemTabaco` | Removed | Apparel has no age restriction |
| CPF used for age verification | CPF used for invoices and boleto only | Less personal data |
| No advertising pixel | Open (DEC-04) | The ban came from tobacco advertising rules |
| Gateway acceptance risk and spike | No acceptance spike | The risk came from tobacco |
| Simple product variants | Size and colour matrix, size guide, images per colour | Core of an apparel store |
| Stray Dog palette and "Rua" component style | NozCo brand; style open (DEC-01, DEC-02) | Different brand |
| Focus NFe assumed | Open (Q-01) | Depends on the accountant |

## Alternatives considered

- **Keep Next.js and a custom back office:** lower hosting needs and no Redis, but about 30 h of back
  office to build and no reuse of the tabacaria's knowledge or code.
- **Hosted platform (Shopify, Nuvemshop):** fastest launch and no infrastructure, but rejected when the
  project type was chosen on 2026-10-27.

## Consequences

- Medusa needs an API, a worker, Postgres and Redis running all the time, so the store has a paid
  monthly cost. Q-02 must be answered before EST-04.2.
- The product, cart, order, inventory and promotion models come from Medusa, so the custom catalog,
  order and coupon models of the first plan are dropped.
- Requirements Medusa may not cover directly are checked before they are built: 2FA and roles
  (BE-01.3), size and colour filters and best-seller sorting (BE-02.4).
- The laptop has no Docker, so database-backed tests run in CI.
- The tabacaria repository is a reference only. Code is reused only when it fits this project, and its
  brand, copy and assets are not.
