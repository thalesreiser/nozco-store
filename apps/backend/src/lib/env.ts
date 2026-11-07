import { MedusaError, parseCorsOrigins } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const secret = z.string().min(32, "must have at least 32 characters")
const corsList = z.string().min(1, "must list at least one origin")
const positiveInt = (fallback: number) => z.coerce.number().int().positive().default(fallback)

/** An origin no store setting should ever allow; a regular expression that accepts it accepts all. */
const UNRELATED_ORIGIN = "https://unrelated-origin.invalid"

/**
 * Medusa takes `/pattern/` entries as regular expressions and sends credentialed CORS headers to what
 * they match. A plain `*` never matches anything there, so it would only break the store silently.
 */
function hasCorsWildcard(origins: string): boolean {
  return origins.split(",").some((entry) => {
    const origin = parseCorsOrigins(entry)[0]
    return origin instanceof RegExp ? origin.test(UNRELATED_ORIGIN) : entry.includes("*")
  })
}

const explicitCorsList = corsList.refine(
  (origins) => !hasCorsWildcard(origins),
  'must list explicit origins: a wildcard such as "*" is not allowed in production',
)

function buildSchema(isProduction: boolean) {
  /** Required in production; falls back to a local-only default elsewhere. */
  const requiredInProduction = (schema: z.ZodString, devDefault: string) =>
    isProduction ? schema : schema.default(devDefault)
  const cors = (devDefault: string) =>
    isProduction ? explicitCorsList : corsList.default(devDefault)

  return z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      // Optional outside production: `medusa build` and the test runner do not read it.
      DATABASE_URL: isProduction ? z.url() : z.url().optional(),
      REDIS_URL: z.url().optional(),
      MEDUSA_WORKER_MODE: z.enum(["shared", "server", "worker"]).default("shared"),
      STORE_CORS: cors("http://localhost:3000"),
      ADMIN_CORS: cors("http://localhost:9000"),
      AUTH_CORS: cors("http://localhost:3000,http://localhost:9000"),
      JWT_SECRET: requiredInProduction(secret, "local-development-only-jwt-secret!!"),
      COOKIE_SECRET: requiredInProduction(secret, "local-development-only-cookie-secret"),
      RATE_LIMIT_ENABLED: z
        .enum(["true", "false"])
        .default("true")
        .transform((value) => value === "true"),
      RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: positiveInt(10),
      RATE_LIMIT_LOGIN_MAX_PER_IP: positiveInt(100),
      RATE_LIMIT_LOGIN_WINDOW_SECONDS: positiveInt(900),
      RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: positiveInt(5),
      RATE_LIMIT_SENSITIVE_MAX_PER_IP: positiveInt(60),
      RATE_LIMIT_SENSITIVE_WINDOW_SECONDS: positiveInt(3600),
      RATE_LIMIT_CATALOG_MAX_PER_IP: positiveInt(600),
      RATE_LIMIT_CATALOG_WINDOW_SECONDS: positiveInt(60),
    })
    .superRefine((env, ctx) => {
      // Without Redis a worker never receives events. Server mode cannot have this rule: Medusa's
      // `db:migrate`, `exec` and `user` commands force MEDUSA_WORKER_MODE=server and need no Redis.
      if (env.MEDUSA_WORKER_MODE === "worker" && !env.REDIS_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["REDIS_URL"],
          message: 'is required when MEDUSA_WORKER_MODE is "worker"',
        })
      }
    })
}

export type Env = z.infer<ReturnType<typeof buildSchema>>

/**
 * Validates the environment at boot. The error lists variable names and rules only,
 * never the values, so it is safe to log.
 */
export function parseEnv(source: Record<string, string | undefined> = process.env): Env {
  // An empty value (e.g. `JWT_SECRET=` copied from .env.example) counts as missing.
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ""))
  const result = buildSchema(present.NODE_ENV === "production").safeParse(present)
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n  ")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid environment variables:\n  ${issues}`,
    )
  }
  return result.data
}
