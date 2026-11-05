import { createHash } from "node:crypto"
import { isIP } from "node:net"
import type { Env } from "./env"

export type RateLimitRule = "login" | "register" | "password_reset" | "verification"

export interface RateLimitPolicy {
  maxPerIp: number
  maxPerAccount: number
  windowMs: number
}

/** One request counted in a fixed window. */
export interface RateLimitHit {
  count: number
  resetInMs: number
}

export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitHit>
}

export interface RateLimitDecision {
  allowed: boolean
  retryAfterSeconds: number
  /** Which counter refused the request. Never the IP or the account itself, so it is safe to log. */
  blockedBy?: "ip" | "account"
}

type RateLimitEnv = Pick<
  Env,
  | "RATE_LIMIT_LOGIN_MAX_PER_IP"
  | "RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT"
  | "RATE_LIMIT_LOGIN_WINDOW_SECONDS"
  | "RATE_LIMIT_SENSITIVE_MAX_PER_IP"
  | "RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT"
  | "RATE_LIMIT_SENSITIVE_WINDOW_SECONDS"
>

export function buildRateLimitPolicies(env: RateLimitEnv): Record<RateLimitRule, RateLimitPolicy> {
  const sensitive: RateLimitPolicy = {
    maxPerIp: env.RATE_LIMIT_SENSITIVE_MAX_PER_IP,
    maxPerAccount: env.RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT,
    windowMs: env.RATE_LIMIT_SENSITIVE_WINDOW_SECONDS * 1000,
  }
  return {
    login: {
      maxPerIp: env.RATE_LIMIT_LOGIN_MAX_PER_IP,
      maxPerAccount: env.RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT,
      windowMs: env.RATE_LIMIT_LOGIN_WINDOW_SECONDS * 1000,
    },
    register: sensitive,
    password_reset: sensitive,
    verification: sensitive,
  }
}

/** The request that takes the count to `max` passes; the next one is refused. */
export function isOverLimit(count: number, max: number): boolean {
  return count > max
}

/** Rounded up and never zero: `Retry-After: 0` would invite an immediate retry. */
export function retryAfterSeconds(resetInMs: number): number {
  return Math.max(1, Math.ceil(resetInMs / 1000))
}

function ipv6Prefix(ip: string): string {
  const [head = "", tail = ""] = ip.split("::")
  const left = head ? head.split(":") : []
  const right = tail ? tail.split(":") : []
  const zeros = ip.includes("::") ? 8 - left.length - right.length : 0
  const groups = [...left, ...Array<string>(Math.max(zeros, 0)).fill("0"), ...right]
  return `${groups
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`
}

/**
 * The counter key for a client address. An IPv6 customer controls a whole /64, so counting single
 * addresses would let one client rotate past any limit. Unknown addresses share one counter.
 */
export function ipBucket(ip: string | undefined): string {
  const address = (ip ?? "").split("%")[0]!.toLowerCase()
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(address)
  if (mapped) {
    return mapped[1]!
  }
  if (isIP(address) === 6) {
    return ipv6Prefix(address)
  }
  return isIP(address) === 4 ? address : "unknown"
}

/**
 * The counter key for an account. It is hashed so that Redis never holds an e-mail address. Returns
 * undefined when the identifier is not a usable string; the IP counter still applies then.
 */
export function accountBucket(identifier: unknown): string | undefined {
  if (typeof identifier !== "string") {
    return undefined
  }
  const normalized = identifier.trim().toLowerCase()
  return normalized ? createHash("sha256").update(normalized).digest("hex") : undefined
}

/** `email` on login, register and update; `identifier` on reset-password. */
export function accountIdentifier(body: unknown): unknown {
  if (typeof body !== "object" || body === null) {
    return undefined
  }
  const { email, identifier } = body as { email?: unknown; identifier?: unknown }
  return email ?? identifier
}

/**
 * `POST /auth/:actor_type/:auth_provider` also matches Medusa's own `/auth/token/refresh`,
 * `/auth/mfa/factors` and `/auth/verification/*`. Those are not login attempts.
 */
export function isLoginPath(actorType: string | undefined): boolean {
  return !["token", "mfa", "verification"].includes((actorType ?? "").toLowerCase())
}

/**
 * Counts the request and decides. The IP counter runs first, and a refused IP does not touch the
 * account counter, so one client cannot fill Redis with keys for invented e-mail addresses.
 */
export async function consumeRateLimit(input: {
  store: RateLimitStore
  rule: RateLimitRule
  policy: RateLimitPolicy
  ip: string | undefined
  identifier: unknown
}): Promise<RateLimitDecision> {
  const { store, rule, policy } = input
  const ip = await store.hit(`${rule}:ip:${ipBucket(input.ip)}`, policy.windowMs)
  if (isOverLimit(ip.count, policy.maxPerIp)) {
    return { allowed: false, retryAfterSeconds: retryAfterSeconds(ip.resetInMs), blockedBy: "ip" }
  }

  const account = accountBucket(input.identifier)
  if (account) {
    const hit = await store.hit(`${rule}:account:${account}`, policy.windowMs)
    if (isOverLimit(hit.count, policy.maxPerAccount)) {
      return {
        allowed: false,
        retryAfterSeconds: retryAfterSeconds(hit.resetInMs),
        blockedBy: "account",
      }
    }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}
