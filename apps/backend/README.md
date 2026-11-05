# @nozco/backend

Medusa v2 server, admin dashboard and worker, scaffolded from the official starter without its demo
seed.

## Running it

You only need PostgreSQL 15 (and Redis 7 for server and worker modes) to run the application. Lint,
type-check, build and unit tests work without them, so a local database is optional: EST-03.1 runs
migrations and integration tests in CI against real services.

```sh
cp .env.example .env       # then set DATABASE_URL
pnpm db:migrate
pnpm dev                   # API and admin on http://localhost:9000 (admin under /app)
```

## Environment

`src/lib/env.ts` validates every variable with Zod when `medusa-config.ts` loads. On failure the process
stops and the error names each variable and rule, never its value. `.env.example` documents them.

Outside production, the CORS and secret variables fall back to local-only defaults. In production they
are required, as is `DATABASE_URL`. `medusa start` assumes `NODE_ENV=production` when it is unset, and
`medusa develop` and `medusa build` assume `development`.

## Store setup

`src/migration-scripts/setup-brazil-store.ts` configures the store. `pnpm db:migrate` runs it once per
environment and records it; if it fails, the next migrate retries it. It creates, or reuses when they
already exist:

| What                | Value                                                              |
| ------------------- | ------------------------------------------------------------------ |
| Region              | `Brasil`, country `br`, currency `brl`, prices include taxes       |
| Tax region          | `br` with the system tax provider and no rates (rates are pending) |
| Sales channel       | `loja-online`, default channel of the store                        |
| Publishable API key | `loja-online storefront`, linked to `loja-online`                  |
| Stock location      | `Armazém principal` (placeholder), linked to `loja-online`         |
| Store               | `NozCo`, BRL only and tax-inclusive, defaults above                |

The values live in `src/lib/store-setup/constants.ts` and the decisions in pure, unit-tested functions
(`plan.ts`). Every record is looked up by country, name or title before anything is created, and links
are only added when missing, so running it again changes nothing. To rerun it by hand:
`pnpm exec medusa exec ./src/migration-scripts/setup-brazil-store.ts`. Records are matched by name, so
renaming one in the admin makes a rerun create a new one.

The shipping origin is not in the repository (Q-10): fill it in the admin under **Settings > Locations &
Shipping**. Whether prices include taxes, and the tax rates, are still to be confirmed with the
accountant; the setting can be changed in the admin, on the region and on the store's currency.

### Publishable key for the storefront

The storefront sends this key in the `x-publishable-api-key` header. It scopes Store API requests to the
`loja-online` channel and is public by design, so it is not a secret. Run `pnpm store:publishable-key`
(needs the database) and copy the printed line into `apps/storefront/.env`, or copy the token from the
admin under **Settings > Publishable API Keys**.

## Server and worker modes

`MEDUSA_WORKER_MODE` selects what the process does:

| Value              | What runs                                                  |
| ------------------ | ---------------------------------------------------------- |
| `shared` (default) | API, admin, subscribers and scheduled jobs in one process  |
| `server`           | API and admin; events are handed over to the worker        |
| `worker`           | Subscribers and scheduled jobs; no API routes and no admin |

When `REDIS_URL` is set, the cache, event bus, workflow engine and locking modules use Redis
(`src/lib/redis-modules.ts`). Without it Medusa uses in-memory modules, which only work for one process.

`worker` refuses to start without `REDIS_URL`. `server` cannot enforce this, because Medusa's `db:migrate`,
`exec` and `user` commands force server mode and do not need Redis. **Always give a server the same
`REDIS_URL` as its worker: without it, the server starts normally and its events never reach the worker.**

To run the build, set the variables in the environment (`.env` is not read from the build folder):

```sh
pnpm build
pnpm start          # uses MEDUSA_WORKER_MODE, or shared if unset
pnpm start:server   # same as MEDUSA_WORKER_MODE=server
pnpm start:worker   # same as MEDUSA_WORKER_MODE=worker
```

## Health route

Uptime checks use `GET /health`, which `medusa start` provides in every mode and which answers `200 OK`.
No custom route duplicates it. It only shows the process is up, since it checks neither the database
nor Redis, and it answers only after the application has loaded.

`integration-tests/http/health.spec.ts` covers it. The test runner registers its own copy of this route,
so the same test also calls a protected Medusa route to show the application loaded. The route served by
`medusa start` itself needs a smoke test against a running server.

## Scripts

| Script                         | What it does                                                  |
| ------------------------------ | ------------------------------------------------------------- |
| `pnpm dev`                     | API and admin with reload                                     |
| `pnpm build`                   | Compiles server and admin into `.medusa/server`               |
| `pnpm start`                   | Runs the build                                                |
| `pnpm db:migrate`              | Applies migrations and the store setup (needs `DATABASE_URL`) |
| `pnpm store:publishable-key`   | Prints the storefront publishable key (needs `DATABASE_URL`)  |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript                                         |
| `pnpm test`                    | Unit tests (`src/**/__tests__/*.unit.spec.ts`)                |
| `pnpm test:integration`        | HTTP and module integration tests (needs Postgres, see below) |

`pnpm test:integration` reads `DB_HOST`, `DB_PORT`, `DB_USERNAME` and `DB_PASSWORD`, and creates a
throwaway database per suite. All of these also run from the monorepo root through Turborepo, except
`start:server` and `start:worker`, which need `pnpm --filter @nozco/backend`.
