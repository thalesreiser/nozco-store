import type { H3Error } from "h3"
import type { z } from "zod"

/** The body of every failed `/api/*` response. `code` is stable; the interface translates it. */
export interface ApiErrorBody {
  code: string
  message: string
}

const BY_STATUS: Record<number, ApiErrorBody> = {
  400: { code: "invalid_request", message: "The request is invalid." },
  401: { code: "unauthorized", message: "Sign in to continue." },
  403: { code: "forbidden", message: "This action is not allowed." },
  404: { code: "not_found", message: "Not found." },
  405: { code: "method_not_allowed", message: "Method not allowed." },
  409: { code: "conflict", message: "The request conflicts with the current state." },
  413: { code: "payload_too_large", message: "The request is too large." },
  429: { code: "rate_limited", message: "Too many attempts. Try again later." },
  502: { code: "upstream_error", message: "The store is temporarily unavailable." },
  504: { code: "upstream_timeout", message: "The store took too long to answer." },
}

const INTERNAL_ERROR: ApiErrorBody = { code: "internal_error", message: "Something went wrong." }

// Only errors created here carry text to the client. Anything else, even with a `data` field, is
// reduced to its status, so no thrown error can leak internal details.
const known = new WeakMap<object, ApiErrorBody>()

export function apiError(status: number, body?: ApiErrorBody) {
  const error = createError({ statusCode: status })
  known.set(error, body ?? BY_STATUS[status] ?? INTERNAL_ERROR)
  return error
}

export function isApiError(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && known.get(error)?.code === code
}

export function toApiErrorResponse(error: H3Error): { status: number; body: ApiErrorBody } {
  const body = known.get(error)
  if (body) return { status: error.statusCode, body }
  const generic = BY_STATUS[error.statusCode]
  return generic
    ? { status: error.statusCode, body: generic }
    : { status: 500, body: INTERNAL_ERROR }
}

/** Validates route input. A failure says nothing about the input, which forms already validated. */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input)
  if (!result.success) throw apiError(400)
  return result.data
}
