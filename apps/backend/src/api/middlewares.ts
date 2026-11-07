import { defineMiddlewares } from "@medusajs/framework/http"
import { cpfPayloadSchema } from "@nozco/shared-types"
import { cartErrorHandler } from "./utils/cart-error-handler"
import { hideCpfInResponses, redactCpfInRequestLine } from "./utils/cpf-privacy"
import { rateLimit } from "./utils/rate-limit"
import { validateBody } from "./utils/validate-payload"

export default defineMiddlewares({
  errorHandler: cartErrorHandler,
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
