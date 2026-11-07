import {
  authenticate,
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { cpfPayloadSchema, privacyRequestPayloadSchema } from "@nozco/shared-types"
import { withoutPrivateProductFields } from "../lib/public-product"
import { hideCpfInResponses, redactCpfInRequestLine } from "./utils/cpf-privacy"
import { rateLimit } from "./utils/rate-limit"
import { validateBody } from "./utils/validate-payload"

// Named here as well as by Medusa, because the limits below count the authenticated actor.
const asCustomer = authenticate("customer", ["session", "bearer"])
const asOperator = authenticate("user", ["session", "bearer", "api-key"])

/** The publishable key is public, so what these routes can be asked for must not be private. */
function hidePrivateProductFields(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): void {
  const send = res.json.bind(res)
  res.json = (body: unknown) => send(withoutPrivateProductFields(body))
  next()
}

export default defineMiddlewares({
  routes: [
    { matcher: "/*", middlewares: [redactCpfInRequestLine] },
    { matcher: "/store/carts*", middlewares: [hideCpfInResponses] },
    { matcher: "/store/orders*", middlewares: [hideCpfInResponses] },
    { matcher: "/store/products*", method: ["GET"], middlewares: [hidePrivateProductFields] },
    { matcher: "/store/catalog*", method: ["GET"], middlewares: [rateLimit("catalog")] },
    {
      matcher: "/store/carts/:id/cpf",
      method: ["POST"],
      middlewares: [validateBody(cpfPayloadSchema)],
    },
    {
      matcher: "/store/customers/me/privacy-requests",
      method: ["POST"],
      middlewares: [
        asCustomer,
        rateLimit("privacy_request"),
        validateBody(privacyRequestPayloadSchema),
      ],
    },
    {
      matcher: "/store/customers/me/privacy-requests",
      method: ["GET"],
      middlewares: [asCustomer, rateLimit("privacy_read")],
    },
    {
      matcher: "/admin/privacy-requests",
      method: ["GET"],
      middlewares: [asOperator, rateLimit("privacy_read")],
    },
    {
      matcher: "/admin/privacy-requests/:id/:decision",
      method: ["POST"],
      middlewares: [asOperator, rateLimit("privacy_review")],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider",
      method: ["POST"],
      middlewares: [rateLimit("login")],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/register",
      method: ["POST"],
      middlewares: [rateLimit("register")],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/reset-password",
      method: ["POST"],
      middlewares: [rateLimit("password_reset")],
    },
    {
      matcher: "/auth/:actor_type/:auth_provider/update",
      method: ["POST"],
      middlewares: [rateLimit("password_reset")],
    },
    {
      matcher: "/auth/mfa/challenges/:id/verify",
      method: ["POST"],
      middlewares: [rateLimit("verification")],
    },
    {
      matcher: "/auth/mfa/factors/:id/verify",
      method: ["POST"],
      middlewares: [rateLimit("verification")],
    },
    {
      matcher: "/auth/verification/request",
      method: ["POST"],
      middlewares: [rateLimit("verification")],
    },
    {
      matcher: "/auth/verification/confirm",
      method: ["POST"],
      middlewares: [rateLimit("verification")],
    },
  ],
})
