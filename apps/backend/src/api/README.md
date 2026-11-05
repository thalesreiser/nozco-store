# Custom API routes

File-based routes under `store/`, `admin/` and `hooks/` (webhooks). Input is validated with the Zod schemas in `packages/shared-types`, and errors are `{ code, message }`. None exist yet.

Register `validateBody(schema)` from `utils/validate-payload.ts` for the route in `middlewares.ts`, then read `req.validatedBody` in the handler. Sensitive routes can add `rateLimit(rule)` from `utils/rate-limit.ts`, as the `/auth` routes do.
