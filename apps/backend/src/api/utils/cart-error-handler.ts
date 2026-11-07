import {
  errorHandler,
  getHttpResponseFromError,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { toCartApiError } from "../../lib/cart-errors"
import { sendApiError } from "./api-error"

type MedusaHandlerError = Parameters<typeof getHttpResponseFromError>[0]

const CART_ROUTE = /^\/store\/carts(\/|$)/
const medusaHandler = errorHandler()

// A workflow rejects with a plain copy of the error, so this cannot use `instanceof`. Express's own
// errors, such as body-parser's, carry `statusCode` instead, and Medusa's handler keeps them: their
// message can quote the request body, which the logging rules of BE-03.1 handle there.
function isMedusaError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || "statusCode" in error) return false
  const { type } = error as { type?: unknown }
  return Object.values(MedusaError.Types).some((known) => known === type)
}

/** Medusa's handler everywhere, except that a client error of a cart route answers `{ code, message }`. */
export function cartErrorHandler(
  error: MedusaHandlerError,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): void {
  const answer =
    CART_ROUTE.test(req.path) && isMedusaError(error)
      ? toCartApiError(getHttpResponseFromError(error))
      : null
  if (!answer) {
    medusaHandler(error, req, res, next)
    return
  }
  sendApiError(res, answer.status, answer.error)
}
