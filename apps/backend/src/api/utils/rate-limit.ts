import type {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Redis } from "ioredis"
import { parseEnv } from "../../lib/env"
import {
  accountIdentifier,
  buildRateLimitPolicies,
  consumeRateLimit,
  isLoginPath,
  type RateLimitPolicy,
  type RateLimitRule,
  type RateLimitStore,
} from "../../lib/rate-limit"
import {
  afterFirstConnection,
  createMemoryStore,
  createRedisStore,
  withFallback,
} from "../../lib/rate-limit-store"
import { sendApiError } from "./api-error"

const CONNECT_TIMEOUT_MS = 2000

interface RateLimitRuntime {
  enabled: boolean
  policies: Record<RateLimitRule, RateLimitPolicy>
  store: RateLimitStore
  logger: Pick<Logger, "warn">
}

/** Connects on the first limited request, so commands that only load the code open no connection. */
function createStore(redisUrl: string | undefined, logger: Pick<Logger, "warn">): RateLimitStore {
  if (!redisUrl) {
    logger.warn("Rate limits count per process because REDIS_URL is not set")
    return createMemoryStore()
  }
  // Once connected, a request waits at most the command timeout before the fallback takes over.
  const client = new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    commandTimeout: 500,
    connectTimeout: CONNECT_TIMEOUT_MS,
  })
  const logFailure = (error: unknown) =>
    logger.warn(
      `Rate limit store unavailable: ${error instanceof Error ? error.message : "unknown"}`,
    )
  client.on("error", logFailure)
  const redis = afterFirstConnection(client, createRedisStore(client), CONNECT_TIMEOUT_MS)
  return withFallback(redis, createMemoryStore(), logFailure)
}

let runtime: RateLimitRuntime | undefined

function getRuntime(req: MedusaRequest): RateLimitRuntime {
  if (!runtime) {
    const env = parseEnv()
    const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    runtime = {
      enabled: env.RATE_LIMIT_ENABLED,
      policies: buildRateLimitPolicies(env),
      store: createStore(env.REDIS_URL, logger),
      logger,
    }
  }
  return runtime
}

export async function applyRateLimit(
  rule: RateLimitRule,
  config: RateLimitRuntime,
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction,
): Promise<void> {
  if (!config.enabled || (rule === "login" && !isLoginPath(req.params.actor_type))) {
    next()
    return
  }
  const decision = await consumeRateLimit({
    store: config.store,
    rule,
    policy: config.policies[rule],
    ip: req.ip,
    // On an authenticated route the session names the account; a body is the client's to vary.
    identifier:
      (req as Partial<AuthenticatedMedusaRequest>).auth_context?.actor_id ??
      accountIdentifier(req.body),
  })
  if (decision.allowed) {
    next()
    return
  }
  config.logger.warn(`Rate limit exceeded: ${rule} (${decision.blockedBy})`)
  res.setHeader("Retry-After", String(decision.retryAfterSeconds))
  sendApiError(res, 429, { code: "rate_limited", message: "Too many attempts. Try again later." })
}

export function rateLimit(rule: RateLimitRule) {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): Promise<void> =>
    applyRateLimit(rule, getRuntime(req), req, res, next)
}
