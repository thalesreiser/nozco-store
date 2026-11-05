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

Commits must follow Conventional Commits; the `commit-msg` hook rejects anything else, and the
`pre-commit` hook lints and formats staged files. `apps/backend` is not scaffolded yet (task
BE-01.1).

## Storefront

`apps/storefront` is the Nuxt 4 store, currently a placeholder page.

```sh
cp apps/storefront/.env.example apps/storefront/.env
pnpm dev                                                # http://localhost:3000
```

The server refuses to start if a `NUXT_PUBLIC_*` variable in `.env.example` is missing or invalid,
and the error names each one. `nuxt preview` reads `.env`; a production server must receive the
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

Proprietary — all rights reserved. See [LICENSE](LICENSE).
