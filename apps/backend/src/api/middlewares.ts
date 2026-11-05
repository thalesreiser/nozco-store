import { defineMiddlewares } from "@medusajs/framework/http"
import { rateLimit } from "./utils/rate-limit"

export default defineMiddlewares({
  routes: [
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
