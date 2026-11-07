import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { type ApiError, sendApiError } from "./api-error"

/**
 * Any Zod schema. Structural on purpose: Medusa bundles its own Zod version, and the schemas in
 * `packages/shared-types` use the workspace's.
 */
export interface PayloadSchema<T> {
  safeParse(input: unknown):
    | { success: true; data: T }
    | {
        success: false
        error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> }
      }
}

export type PayloadResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

/** The message names fields and rules, never the submitted values, so it is safe to return and log. */
export function parsePayload<T>(schema: PayloadSchema<T>, input: unknown): PayloadResult<T> {
  const result = schema.safeParse(input)
  if (result.success) {
    return { ok: true, data: result.data }
  }
  const message = result.error.issues
    .map((issue) =>
      issue.path.length ? `${issue.path.map(String).join(".")}: ${issue.message}` : issue.message,
    )
    .join("; ")
  return { ok: false, error: { code: "invalid_payload", message } }
}

/**
 * Route middleware: answers 400 with `{ code, message }`, or stores the parsed body in
 * `req.validatedBody` for the route handler.
 */
export function validateBody<T>(schema: PayloadSchema<T>) {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void => {
    const result = parsePayload(schema, req.body)
    if (!result.ok) {
      sendApiError(res, 400, result.error)
      return
    }
    req.validatedBody = result.data
    next()
  }
}

/**
 * Route middleware for a route of Medusa's own, whose validator sets `req.validatedBody` and runs first:
 * answers 400 with `{ code, message }` under the given code, and otherwise only lets the request through.
 */
export function checkBody<T>(schema: PayloadSchema<T>, code: string) {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void => {
    const result = parsePayload(schema, req.body)
    if (!result.ok) {
      sendApiError(res, 400, { code, message: result.error.message })
      return
    }
    next()
  }
}
