/** The status and body Medusa would answer with, from `getHttpResponseFromError`. */
export interface MedusaErrorAnswer {
  statusCode: number
  body: { code?: string; message?: string }
}

export interface CartApiError {
  status: number
  error: { code: string; message: string }
}

// The codes the storefront already uses for these failures: `DataSourceErrorCode` and `BY_STATUS` in
// `apps/storefront`, `cart_not_found` in its session helper, `cart_completed` in the CPF route.
const INSUFFICIENT_STOCK: CartApiError = {
  status: 409,
  error: { code: "insufficient_stock", message: "The requested quantity is not in stock." },
}

// Medusa gives these failures a type but no code, so its message is all that tells them apart. They
// are pinned by `integration-tests/http/cart-rules.spec.ts`. If an upgrade rewords one, the answer
// falls back to the generic code of its status, so the failure is still reported as a failure.
const BY_MESSAGE: { pattern: RegExp; result: CartApiError }[] = [
  {
    pattern: /^Cart id not found/,
    result: { status: 404, error: { code: "cart_not_found", message: "The cart does not exist." } },
  },
  {
    pattern: /^Cart \S+ is already completed/,
    result: {
      status: 409,
      error: { code: "cart_completed", message: "The cart is already completed." },
    },
  },
  {
    pattern: /^Variants .* do not exist/,
    result: { status: 404, error: { code: "not_found", message: "The variant is not on sale." } },
  },
]

const CODE_BY_STATUS: Record<number, string> = {
  400: "invalid_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "invalid_request",
}

/**
 * Turns a client error of a cart route into `{ code, message }`. Answers null for a server error, which
 * stays with Medusa's handler, as does its logging.
 */
export function toCartApiError({ statusCode, body }: MedusaErrorAnswer): CartApiError | null {
  if (statusCode >= 500) return null
  if (body.code === "insufficient_inventory") return INSUFFICIENT_STOCK

  const message = body.message ?? "The request could not be completed."
  const known = BY_MESSAGE.find(({ pattern }) => pattern.test(message))
  if (known) return known.result

  return {
    status: statusCode,
    error: { code: CODE_BY_STATUS[statusCode] ?? "invalid_request", message },
  }
}
