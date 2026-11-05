import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

const secret = z.string().min(32, "must have at least 32 characters")
const corsList = z.string().min(1, "must list at least one origin")

function buildSchema(isProduction: boolean) {
  /** Required in production; falls back to a local-only default elsewhere. */
  const requiredInProduction = (schema: z.ZodString, devDefault: string) =>
    isProduction ? schema : schema.default(devDefault)

  return z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      // Optional outside production: `medusa build` and the test runner do not read it.
      DATABASE_URL: isProduction ? z.url() : z.url().optional(),
      REDIS_URL: z.url().optional(),
      MEDUSA_WORKER_MODE: z.enum(["shared", "server", "worker"]).default("shared"),
      STORE_CORS: requiredInProduction(corsList, "http://localhost:3000"),
      ADMIN_CORS: requiredInProduction(corsList, "http://localhost:9000"),
      AUTH_CORS: requiredInProduction(corsList, "http://localhost:3000,http://localhost:9000"),
      JWT_SECRET: requiredInProduction(secret, "local-development-only-jwt-secret!!"),
      COOKIE_SECRET: requiredInProduction(secret, "local-development-only-cookie-secret"),
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
