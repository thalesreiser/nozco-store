import { authenticate, defineMiddlewares } from "@medusajs/framework/http"
import { cpfPayloadSchema, privacyRequestPayloadSchema } from "@nozco/shared-types"
import { hideCpfInResponses, redactCpfInRequestLine } from "./utils/cpf-privacy"
import { rateLimit } from "./utils/rate-limit"
import { validateBody } from "./utils/validate-payload"

// Named here as well as by Medusa, because the limits below count the authenticated actor.
const asCustomer = authenticate("customer", ["session", "bearer"])
const asOperator = authenticate("user", ["session", "bearer", "api-key"])

export default defineMiddlewares({
  routes: [
    { matcher: "/*", middlewares: [redactCpfInRequestLine] },
    { matcher: "/store/carts*", middlewares: [hideCpfInResponses] },
    { matcher: "/store/orders*", middlewares: [hideCpfInResponses] },
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
