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
`medusa start` itself is covered by the `backend-boot-smoke` CI job (`.github/scripts/backend-boot-smoke.sh`).

## Scripts

| Script                         | What it does                                                  |
| ------------------------------ | ------------------------------------------------------------- |
| `pnpm dev`                     | API and admin with reload                                     |
| `pnpm build`                   | Compiles server and admin into `.medusa/server`               |
| `pnpm start`                   | Runs the build                                                |
| `pnpm db:migrate`              | Applies migrations (needs `DATABASE_URL`)                     |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript                                         |
| `pnpm test`                    | Unit tests (`src/**/__tests__/*.unit.spec.ts`)                |
| `pnpm test:integration`        | HTTP and module integration tests (needs Postgres, see below) |

`pnpm test:integration` reads `DB_HOST`, `DB_PORT`, `DB_USERNAME` and `DB_PASSWORD`, and creates a
throwaway database per suite. All of these also run from the monorepo root through Turborepo, except
`start:server` and `start:worker`, which need `pnpm --filter @nozco/backend`.
