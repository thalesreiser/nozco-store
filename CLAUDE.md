# Working on nozco-store

Read this file before every task. It applies to every contributor, human or automated. App-specific
rules live in `apps/backend/CLAUDE.md` and `apps/storefront/CLAUDE.md`. If anything here conflicts with
another document, follow the stricter rule and point out the conflict on the task card.

## Sources of truth

- **Development plan** (tracks, tasks, sub-tasks, estimates): `docs/development-plan.md`.
- **Requirements:** `docs/02-requirements.md`. **Architecture:** `docs/04-architecture.md`. **Frontend
  rules:** `docs/05-frontend-standards.md`.
- **Decisions taken:** `docs/adr/`. **Decisions pending:** `docs/03-open-questions.md`.
- **Task board** (Trello, pt-BR): https://trello.com/b/yyh9ZqLI. Card names carry the task ID, e.g.
  `[BE-05.2]`.

## Who decides what

Contributors implement; Thales decides. Never decide the items below on your own:

- **Design, UI and UX:** visual identity, page layout, navigation flows, interface copy, new base
  components, mobile behaviour.
- **Data model:** migrations that drop or rename tables or columns, or change a column type.
- **API contract:** changing or removing a public route, or a payload change that breaks a consumer.
- **Business rules:** prices, installments, coupons, stock, shipping, exchanges and returns, invoices.
- **Security and personal data:** authentication, permissions, CPF handling, logging.
- **Integrations, infrastructure and cost:** a new or replaced provider, a relevant new dependency, a
  paid plan, any change to CI/CD or repository settings.
- **Removing a feature** or changing behaviour the customer can notice.

When you reach one of these:

1. Pause only the affected part; keep working on the rest of the task.
2. Ask on the task card and in the PR: context, 2 or 3 options with pros and cons, impact and a
   recommendation. For UI, describe or mock up each option.
3. Wait for Thales's answer on the card.
4. Record the decision as an ADR (`docs/adr/NNN-short-title.md`, see `000-template.md`), close the item
   in `docs/03-open-questions.md` and link the ADR from the PR.
5. Resume following the ADR.

Routine implementation choices (library versions inside the agreed stack, lint strictness, file layout)
do not need a decision: pick the most sensible option and list it under "Implementation choices" in the
PR description with the reason.

## Workflow for every task

1. **Pick** a card in "Pronto" whose dependencies are done and move it to "Em andamento".
2. **Check the Definition of Ready.** If an acceptance criterion, a decision or an API contract is
   missing, comment what is missing and pick another card.
3. **Read** this file, the plan entry for the task, related ADRs and the surrounding code.
4. **Branch** from an up-to-date `develop`: `feat/<task-id>-<slug>`, `fix/<task-id>-<slug>` or
   `chore/<task-id>-<slug>`.
5. **Tests first** for business rules, then the code.
6. **Commit** in small steps (see Conventions).
7. **Verify:** `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build && pnpm test`. For UI, open
   the page on desktop and mobile and take screenshots.
8. **Open the PR** against `develop` with the template, then move the card to "Revisão".
9. **Address review** with new commits; never rewrite history that was already reviewed.
10. **Merge** is always done by a person. The card goes to "Concluído" after the merge and, once staging
    exists (EST-04.2), after the staging deploy and a smoke test pass.

`develop` deploys to staging. A version tag on `main` deploys to production.

If you are stuck after two attempts (an error you do not understand, a test you cannot make pass, an
unclear requirement), stop, describe what you tried on the card and ask for help. Never work around it
by disabling a test, a lint rule or a type check.

Task cards get dated comments in Portuguese when work starts, when the PR opens and when it is done.

## Commands

| Command                             | What it does                         |
| ----------------------------------- | ------------------------------------ |
| `pnpm install`                      | Install everything and the Git hooks |
| `pnpm build`                        | Build every package (Turborepo)      |
| `pnpm typecheck`                    | Type-check every package             |
| `pnpm lint`                         | ESLint in every package              |
| `pnpm test`                         | Tests in every package               |
| `pnpm format` / `pnpm format:check` | Prettier (write / check only)        |

The development laptop has no Docker and 7.7 GB of RAM. Database-backed tests run in CI, and builds and
test suites run one at a time.

## Conventions

- Node.js 24 LTS and pnpm 10 only (`pnpm install` refuses other versions).
- TypeScript `strict`; no `any`, no `@ts-ignore`, `@ts-expect-error` only with a description.
- Follow existing patterns and reuse modules, composables and schemas before creating new ones.
- One task per branch and per PR, roughly 400 changed lines at most, not counting the lockfile; split
  bigger work.
- Business rules ship with tests. Never delete, weaken or skip a test to make CI pass.
- **Language:** code, commits, branches, PRs and repository docs in English; Trello cards and comments
  in Brazilian Portuguese; user-facing text in Brazilian Portuguese.
- **Commits:** Conventional Commits with the task ID, e.g. `feat(checkout): add pix polling (FE-06.2)`.
  No co-author trailers or tool-generated footers in commits or PRs, and no mention of the tools used to
  write the code.

## What never goes into this repository

- Secrets of any kind: API keys, tokens, passwords, `.env` files (only `.env.example`).
- Customer data: CPF, names, addresses, e-mails, orders, even in tests or fixtures.
- Business-sensitive data: real tax settings, contracts, supplier prices, draft legal texts. These live
  in environment variables or private documents.

**Fixtures and seeds use fictional data only:** invented products, generated CPFs that are clearly test
values, and example addresses. Never copy real customers, orders or third-party catalog content.

## Finishing a task

- Fill the PR template: Definition of Done, decisions, what could not be tested.
- UI changes include desktop and mobile screenshots.
- Merge and production deploys are always done by a person.
