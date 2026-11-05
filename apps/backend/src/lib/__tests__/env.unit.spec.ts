import { parseEnv } from "../env"

const strongSecret = "x".repeat(32)

const production = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://user:pass@db.example:5432/store",
  STORE_CORS: "https://store.example",
  ADMIN_CORS: "https://admin.example",
  AUTH_CORS: "https://store.example",
  JWT_SECRET: strongSecret,
  COOKIE_SECRET: strongSecret,
}

describe("parseEnv", () => {
  it("fills local defaults outside production", () => {
    const env = parseEnv({ NODE_ENV: "development" })

    expect(env.STORE_CORS).toBe("http://localhost:3000")
    expect(env.MEDUSA_WORKER_MODE).toBe("shared")
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(32)
  })

  it("treats empty values as missing", () => {
    const env = parseEnv({ NODE_ENV: "development", JWT_SECRET: "", REDIS_URL: "" })

    expect(env.JWT_SECRET).not.toBe("")
    expect(env.REDIS_URL).toBeUndefined()
  })

  it("requires the database, CORS and secrets in production", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(
      /DATABASE_URL[\s\S]*STORE_CORS[\s\S]*JWT_SECRET[\s\S]*COOKIE_SECRET/,
    )
  })

  it("rejects short secrets in production without echoing the value", () => {
    const env = { ...production, JWT_SECRET: "short-secret-value" }

    expect(() => parseEnv(env)).toThrow(/JWT_SECRET: must have at least 32 characters/)
    expect(() => parseEnv(env)).not.toThrow(/short-secret-value/)
  })

  it("accepts a complete production environment", () => {
    expect(parseEnv(production).NODE_ENV).toBe("production")
  })

  it("rejects a malformed database URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "not a url" })).toThrow(/DATABASE_URL/)
  })

  it("rejects an unknown worker mode", () => {
    expect(() => parseEnv({ MEDUSA_WORKER_MODE: "both" })).toThrow(/MEDUSA_WORKER_MODE/)
  })

  it("requires Redis in worker mode", () => {
    const worker = { ...production, MEDUSA_WORKER_MODE: "worker" }

    expect(() => parseEnv(worker)).toThrow(/REDIS_URL: is required/)
    expect(parseEnv({ ...worker, REDIS_URL: "redis://cache.example:6379" }).REDIS_URL).toBe(
      "redis://cache.example:6379",
    )
  })

  // `medusa db:migrate`, `exec` and `user` force server mode, and must work without Redis.
  it.each(["shared", "server"])("does not require Redis in %s mode", (mode) => {
    const env = parseEnv({ ...production, MEDUSA_WORKER_MODE: mode })

    expect(env.MEDUSA_WORKER_MODE).toBe(mode)
    expect(env.REDIS_URL).toBeUndefined()
  })
})
