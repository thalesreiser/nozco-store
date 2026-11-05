import type { MedusaResponse } from "@medusajs/framework/http"

/** The error body of every custom route. `code` is stable; the storefront translates it for people. */
export interface ApiError {
  code: string
  message: string
}

export function sendApiError(res: MedusaResponse, status: number, error: ApiError): void {
  res.status(status).json(error)
}
