# 06 - Traceability

Each requirement maps to the tasks that implement it, the tests that verify it and the PR that
delivered it. Updated in every PR (Definition of Done).

| Req. | Task(s) | Tests | PR | Status |
|---|---|---|---|---|
| RF-01 | BE-02.5, FE-11.1 | | | Planned |
| RF-02 | BE-02.4, FE-04.1a, FE-04.1b | | | Planned |
| RF-03 | BE-02.1, FE-04.2a, FE-04.2b | BE-02.1: `apparel/__tests__/variants.unit.spec.ts`, `packages/shared-types/tests/apparel.test.ts`, `integration-tests/http/apparel-product.spec.ts` (variants, stock and availability, compare-at price, fabric metadata) | BE-02.1 PR | In progress |
| RF-04 | BE-02.4, FE-04.3 | | | Planned |
| RF-05 | BE-04.1, FE-05.1a, FE-05.1b | | | Planned |
| RF-06 | BE-06.1, FE-05.2 | | | Planned |
| RF-07 | BE-04.2, FE-05.2 | | | Planned |
| RF-08 | BE-03.1, BE-03.4, BE-03.5, FE-06.1 | BE-03.1: `packages/shared-types/tests/cpf.test.ts` (check digits, shared schema, mask); `integration-tests/http/cart-cpf.spec.ts` (invalid CPF rejected end to end) | BE-03.1 PR | In progress |
| RF-09 | BE-05.1, BE-05.3, FE-06.2, FE-06.3 | | | Planned |
| RF-10 | BE-05.2 | | | Planned |
| RF-11 | BE-09.1, FE-06.4 | | | Planned |
| RF-12 | BE-07.3, FE-06.4, FE-07.1 | | | Planned |
| RF-13 | BE-07.2, FE-07.2 | | | Planned |
| RF-14 | BE-01.3 | | | Planned |
| RF-15 | BE-02.1, BE-02.2, BE-02.3, BE-02.5 | BE-02.1: `integration-tests/http/apparel-product.spec.ts` (categories, collections and types through Medusa's models) | BE-02.1 PR | In progress |
| RF-16 | BE-06.2, BE-07.1, BE-07.4 | | | Planned |
| RF-17 | BE-07.2 | | | Planned |
| RF-18 | BE-08.1 | | | Planned |
| RF-19 | BE-09.2, FE-11.3 | FE-11.3 (interface and validation only): `tests/unit/store-info.test.ts`, `tests/components/layout.test.ts`, `tests/e2e/global-layout.spec.ts` | FE-11.3 PR | In progress |
| RF-20 | FE-11.2, FE-11.3 | FE-11.3: `tests/components/layout.test.ts`, `tests/e2e/global-layout.spec.ts` | FE-11.3 PR | In progress |
| RF-21 | BE-07.4 | | | Planned |
| RF-22 | BE-03.2, FE-03.1, FE-07.3 | | | Planned |
| RF-23 | BL-01.1 | | | Planned |
| RF-24 | BL-01.2 | | | Planned |
| RNF-01 | EST-04.3, BE-02.2, FE-09.2, FE-10.1 | | | Planned |
| RNF-02 | EST-03.2, EST-03.3, EST-05.2, BE-05.2, BE-10.2, BE-03.4, BE-03.5, FE-02.2 | EST-03.2: `Security` and `CodeQL` workflows (dependency audit, Gitleaks on the full history, CodeQL). EST-03.3: `image.yml` checks the image holds no build placeholders or `.env` files and scans it with Trivy (high and critical fail). BE-10.2: `pnpm test` (CORS wildcard rule, rate limit logic and stores, payload validation), `integration-tests/http/rate-limit.spec.ts` in CI; FE-02.2: `apps/storefront/tests/server/*.test.ts` (cookie flags, token never in a body, CSRF, error contract, cents, guest routes, no Node modules) | #11, #12, #15, #18 | In progress |
| RNF-03 | EST-05.2, BE-01.3 | | | Planned |
| RNF-04 | EST-05.1, BE-03.1, BE-03.3, BE-03.4, BE-03.5, BE-09.2, FE-06.1, FE-07.3, FE-08.1 | BE-03.1: `log-redaction.unit.spec.ts`, `cpf-privacy.unit.spec.ts`; `integration-tests/http/cart-cpf.spec.ts` (no CPF in logs or in store cart and order responses); BE-03.3: `lib/privacy/__tests__/*.unit.spec.ts`, `packages/shared-types/tests/privacy.test.ts`, `integration-tests/http/privacy-requests.spec.ts` in CI (another customer refused, export content, anonymisation keeps the order) | BE-03.1 PR, BE-03.3 PR | In progress |
| RNF-05 | EST-03.3, EST-04.2, EST-05.3, BE-05.4, BE-07.1 | EST-03.3: `image.yml` runs the migrations and checks `/health` from the image, with Postgres and Redis | #11 | In progress |
| RNF-06 | FE-01.2, FE-09.1, FE-12.1 | FE-01.2: `tests/design/contrast.test.ts` (WCAG ratios on both grounds), `tests/design/tailwind.test.ts`, `tests/design/raw-colours.test.ts`, `tests/e2e/design-tokens.spec.ts`. FE-12.1: `tests/components/base-components.test.ts`, `tests/e2e/component-gallery.spec.ts` (axe on each component, on both grounds, desktop and mobile; 44 px targets; focus; keyboard), `tests/unit/gallery.test.ts` | #24, FE-12.1 PR | In progress |
| RNF-07 | FE-04.4 | | | Planned |
| RNF-08 | EST-04.4, FE-08.1, FE-08.2 | | | Planned |
| RNF-09 | EST-01.2, EST-01.3, EST-01.4, EST-03.1, BE-01.1, BE-10.1, FE-01.1, FE-02.1, FE-09.1 | EST-01.3: `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, commit-msg hook; FE-01.1: storefront `vue-tsc` and typed lint, `pnpm test` (runtime config, components), `pnpm test:e2e` (SSR smoke, axe); BE-01.1: backend `tsc` and typed lint, `pnpm test` (env validation, Redis modules); `integration-tests/http/health.spec.ts`; EST-03.1: CI jobs `quality`, `build`, `backend-integration` (migrations twice, schema diff, `test:integration`), `backend-boot-smoke` (real `medusa start`, server and worker, refusal on missing variables), `storefront-e2e`, `ci-ok`; FE-02.1: `tests/unit/composables.test.ts`, `tests/unit/data-source.test.ts`, `tests/unit/runtime-config.test.ts`, `scripts/check-fixtures.mjs` after each build | #3, #6, #7, #10, #16 | In progress |
| RN-01 | BE-01.2, BE-02.1 | BE-01.2: `pnpm test` (`store-setup/__tests__/plan.unit.spec.ts`: Brazil region in BRL); `integration-tests/http/store-setup.spec.ts` passes in CI; BE-02.1: `apparel/__tests__/sale.unit.spec.ts`, `integration-tests/http/apparel-product.spec.ts` (regular and sale price in major units, per ADR 004) | #14, BE-02.1 PR | In progress |
| RN-02 | BE-05.3, FE-06.3 | | | Planned |
| RN-03 | BE-05.4 | | | Planned |
| RN-04 | BE-07.2, FE-07.2 | | | Planned |
| RST-01 | EST-04.1, EST-05.1, FE-11.2, FE-11.3 | FE-11.3 (footer, from runtime config): `tests/components/layout.test.ts`, `tests/e2e/global-layout.spec.ts` | FE-11.3 PR | In progress |
| RST-02 | EST-02.1 | EST-02.1: `infra/docker-compose.yml` validated structurally only; `pnpm infra:up` not run, as the laptop has no Docker | #9 | In progress |
