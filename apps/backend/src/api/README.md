# Custom API routes

File-based routes under `store/`, `admin/` and `hooks/` (webhooks). Input is validated with the Zod schemas in `packages/shared-types`.

- `store/carts/[id]/cpf`: sets the CPF of a cart (BE-03.1). The CPF goes in the body, never in a URL, because the access log writes URLs.
- `middlewares.ts`: keeps the CPF out of store cart and order responses and out of the access log.
