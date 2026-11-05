import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { withoutCpfInMetadata } from "../../lib/cart-cpf"
import { redactCpfInText } from "../../lib/log-redaction"

/**
 * Medusa returns `metadata` by default from the store cart routes, where holding the cart ID is enough,
 * and from the customer's order list, so the CPF stored there must not go out with them.
 */
export function hideCpfInResponses(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): void {
  const send = res.json.bind(res)
  res.json = (body: unknown) => send(withoutCpfInMetadata(body))
  next()
}

/**
 * The access log writes the URL and the referrer straight to stdout when the response ends, past the
 * logger. It reads `originalUrl`, which routing does not use, so a client that puts a CPF in a URL
 * does not get it logged.
 */
export function redactCpfInRequestLine(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction,
): void {
  req.originalUrl = redactCpfInText(req.originalUrl)
  if (req.headers.referer) {
    req.headers.referer = redactCpfInText(req.headers.referer)
  }
  next()
}
