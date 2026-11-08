import {
  authenticate,
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import {
  cartQuantitiesSchema,
  cpfPayloadSchema,
  privacyRequestPayloadSchema,
  privacyRequestRejectionSchema,
} from "@nozco/shared-types"
import { withoutPrivateProductFields } from "../lib/public-product"
import { cartErrorHandler } from "./utils/cart-error-handler"
import { hideCpfInResponses, redactCpfInRequestLine } from "./utils/cpf-privacy"
import { rateLimit } from "./utils/rate-limit"
import { checkBody, validateBody } from "./utils/validate-payload"

// Named here as well as by Medusa, because the limits below count the authenticated actor.
const asCustomer = authenticate("customer", ["session", "bearer"])
const asOperator = authenticate("user", ["session", "bearer", "api-key"])
const checkCartQuantities = checkBody(cartQuantitiesSchema, "invalid_quantity")

// The standard store routes that can return a product, a variant or their parents.
const PRODUCT_READ_ROUTES = [
  "/store/products*",
  "/store/product-variants*",
  "/store/product-categories*",
  "/store/product-tags*",
  "/store/product-types*",
  "/store/collections*",
]

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
  errorHandler: cartErrorHandler,
  routes: [
    { matcher: "/*", middlewares: [redactCpfInRequestLine] },
    { matcher: "/store/carts*", middlewares: [hideCpfInResponses] },
    { matcher: "/store/orders*", middlewares: [hideCpfInResponses] },
    ...PRODUCT_READ_ROUTES.map((matcher) => ({
      matcher,
      method: ["GET" as const],
      middlewares: [hidePrivateProductFields],
    })),
    { matcher: "/store/catalog*", method: ["GET"], middlewares: [rateLimit("catalog")] },
    { matcher: "/store/content*", method: ["GET"], middlewares: [rateLimit("content")] },
    { matcher: "/store/carts", method: ["POST"], middlewares: [checkCartQuantities] },
    {
      matcher: "/store/carts/:id/line-items",
      method: ["POST"],
      middlewares: [checkCartQuantities],
    },
    {
      matcher: "/store/carts/:id/line-items/:line_id",
      method: ["POST"],
      middlewares: [checkCartQuantities],
    },
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
      matcher: "/admin/privacy-requests/:id/approve",
      method: ["POST"],
      middlewares: [asOperator, rateLimit("privacy_review")],
    },
    {
      matcher: "/admin/privacy-requests/:id/reject",
      method: ["POST"],
      middlewares: [
        asOperator,
        rateLimit("privacy_review"),
        validateBody(privacyRequestRejectionSchema),
      ],
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
