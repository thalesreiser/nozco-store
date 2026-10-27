# NozCo Store

Online store for **NozCo**, a Brazilian streetwear brand of urban-art inspired t-shirts
(black, white and grey palette). Production domain: **nozco.com.br**.

> Status: planning. See the [development plan](docs/development-plan.md).

## Scope at a glance
- Product catalog with sizes and colours, stock per variant
- Cart, shipping quote by CEP and checkout (Pix, card up to 6x interest-free, boleto)
- Order tracking, exchanges and returns
- Back office for products, stock and orders

## Documentation
| Doc | Content |
|---|---|
| [01 - Vision and scope](docs/01-vision-and-scope.md) | Problem, goals, scope, stakeholders |
| [02 - Requirements](docs/02-requirements.md) | Functional and non-functional requirements (MoSCoW), risks |
| [03 - Open questions](docs/03-open-questions.md) | Business decisions still pending |
| [06 - Traceability](docs/06-traceability.md) | Requirement → task → test → PR |
| [Development plan](docs/development-plan.md) | Epics, tasks, sub-tasks and estimates |
| [ADRs](docs/adr/) | Architecture decision records |

## Workflow
Trunk-based development: every change goes through a pull request to `main`, with
[Conventional Commits](https://www.conventionalcommits.org/) and the Definition of Done in the
PR template. Tasks are tracked on the project's Trello board.

## License
Proprietary — all rights reserved. See [LICENSE](LICENSE).
