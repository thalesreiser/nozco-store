# NozCo Store

Online store for **NozCo**, a Brazilian streetwear brand of urban-art inspired t-shirts
(black, white and grey palette). Production domain: **nozco.com.br**.

> Status: in development. See the [development plan](docs/development-plan.md).

## Scope at a glance

- Product catalog with sizes and colours, stock per variant
- Cart, shipping quote by CEP and checkout (Pix, card up to 6x interest-free, boleto)
- Order tracking, exchanges and returns
- Back office for products, stock and orders

## Stack

Monorepo with a **Nuxt 4** storefront and a **Medusa v2** backend (PostgreSQL, Redis), Mercado Pago and
Melhor Envio, hosted on Cloudflare and Railway. See [ADR 001](docs/adr/001-nuxt-medusa-stack.md).

## Setup

Requires **Node.js 24** (see `.nvmrc`) and **pnpm**, pinned in `package.json` and provided by Corepack.

```sh
corepack enable   # if it lacks permission, prefix pnpm commands with "corepack"
pnpm install      # also installs the Git hooks
```

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `pnpm lint`         | ESLint in every package and on the root config files |
| `pnpm typecheck`    | TypeScript check in every package                    |
| `pnpm format`       | Formats with Prettier (`docs/` is excluded)          |
| `pnpm format:check` | Checks formatting without changing files             |
| `pnpm build`        | Builds every package through Turborepo               |
| `pnpm test`         | Runs unit and component tests through Turborepo      |
| `pnpm test:e2e`     | Builds, then runs the Playwright tests               |
| `pnpm dev`          | Starts the apps in development mode                  |
| `pnpm preview`      | Builds, then serves the production build             |
| `pnpm infra:up`     | Starts Postgres and Redis in Docker (see below)      |
| `pnpm infra:down`   | Stops them and keeps their data                      |

Commits must follow Conventional Commits; the `commit-msg` hook rejects anything else, and the
`pre-commit` hook lints and formats staged files. To run the backend, see
[`apps/backend/README.md`](apps/backend/README.md).

## Local services

Docker is optional. Only running the backend and its integration tests needs PostgreSQL or Redis.

### With Docker

`infra/docker-compose.yml` runs PostgreSQL 15 and Redis 7, reachable from this machine only.

```sh
pnpm infra:up     # needs Docker Compose v2; returns once both services are healthy
pnpm infra:down   # stops them; the data stays in named volumes
```

| Service    | Address          | Defaults                                         |
| ---------- | ---------------- | ------------------------------------------------ |
| PostgreSQL | `127.0.0.1:5432` | user `nozco`, password `nozco_local`, db `nozco` |
| Redis      | `127.0.0.1:6379` | no password                                      |

These credentials are for local use only. To change them or the ports, copy `infra/.env.example` to
`infra/.env`, and update `DATABASE_URL` and `REDIS_URL` in `apps/backend/.env` to match. Postgres applies
its user, password and database only when the volume is first created, so a change to them needs a reset,
which **deletes the local data**:

```sh
docker compose -f infra/docker-compose.yml down -v
```

`DATABASE_URL` in `apps/backend/.env.example` already matches the defaults. To use Redis, set
`REDIS_URL=redis://127.0.0.1:6379` there. To run the backend integration tests against these services:

```sh
DB_HOST=127.0.0.1 DB_USERNAME=nozco DB_PASSWORD=nozco_local pnpm test:integration
```

### Without Docker

Lint, type-check, build and unit tests need neither service, and the storefront does not need them yet.
Database-backed tests (migrations and integration tests) belong in GitHub Actions, so a laptop does not
need Docker. That CI job arrives with EST-03.1; until then these tests only run where a database is
available. To run the backend itself, set `DATABASE_URL` in `apps/backend/.env` to any PostgreSQL 15
server.

## Storefront

`apps/storefront` is the Nuxt 4 store, currently a placeholder page.

```sh
cp apps/storefront/.env.example apps/storefront/.env
pnpm dev                                                # http://localhost:3000
```

The server refuses to start if a `NUXT_PUBLIC_*` variable in `.env.example` is missing or invalid,
and the error names each one. With `NUXT_PUBLIC_APP_ENV=production` the legal data is required too.
`nuxt preview` reads `.env`; a production server must receive the
variables from its environment.

The first e2e run needs a browser, which is not installed with the dependencies:

```sh
pnpm --filter @nozco/storefront exec playwright install chromium
pnpm test:e2e
```

## Documentation

| Doc                                                      | Content                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [01 - Vision and scope](docs/01-vision-and-scope.md)     | Problem, goals, scope, stakeholders                                            |
| [02 - Requirements](docs/02-requirements.md)             | Functional and non-functional requirements (MoSCoW), risks                     |
| [03 - Open questions](docs/03-open-questions.md)         | Business, design and repository decisions still pending                        |
| [04 - Architecture](docs/04-architecture.md)             | Components, repository structure, payment sequence, order states, environments |
| [05 - Frontend standards](docs/05-frontend-standards.md) | Route map and component, data, form, accessibility and performance rules       |
| [06 - Traceability](docs/06-traceability.md)             | Requirement → task → test → PR                                                 |
| [Development plan](docs/development-plan.md)             | Structural, backend and frontend tracks with tasks, sub-tasks and estimates    |
| [ADRs](docs/adr/)                                        | Architecture decision records                                                  |

## Workflow

Every change goes through a pull request to `develop`, with
[Conventional Commits](https://www.conventionalcommits.org/) and the Definition of Done in the
PR template. `main` holds releases. Contributor rules are in [CLAUDE.md](CLAUDE.md), and tasks are
tracked on the project's Trello board.

## License

This repository is public for transparency and tooling, but the code is not open source.
Proprietary — all rights reserved. See [LICENSE](LICENSE).
