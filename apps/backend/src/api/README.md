# Custom API routes

File-based routes under `store/`, `admin/` and `hooks/` (webhooks). Input is validated with the Zod schemas in `packages/shared-types`, and errors are `{ code, message }`.

Register `validateBody(schema)` from `utils/validate-payload.ts` for the route in `middlewares.ts`, then read `req.validatedBody` in the handler. Sensitive routes can add `rateLimit(rule)` from `utils/rate-limit.ts`, as the `/auth` routes do.

- `store/carts/[id]/cpf`: sets the CPF of a cart (BE-03.1). The CPF goes in the body, never in a URL, because the access log writes URLs.
- `store/customers/me/privacy-requests` and `admin/privacy-requests`: LGPD export and anonymisation (BE-03.3), described in `docs/lgpd-requests.md`.
- `middlewares.ts` also keeps the CPF out of store cart and order responses and out of the access log.
