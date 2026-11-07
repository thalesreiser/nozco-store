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

  describe.each(["STORE_CORS", "ADMIN_CORS", "AUTH_CORS"])("%s in production", (name) => {
    it.each([
      "*",
      "https://store.example,*",
      "https://*.store.example",
      "/.*/",
      "/.+/",
      "/./",
      "/https?:.*/",
    ])("rejects the wildcard %s", (value) => {
      expect(() => parseEnv({ ...production, [name]: value })).toThrow(
        new RegExp(`${name}: must list explicit origins`),
      )
    })

    it.each([
      "https://store.example",
      "https://store.example,https://www.store.example",
      "/^https:\\/\\/[a-z0-9-]+\\.store\\.example$/",
      "/^https:\\/\\/.*\\.store\\.example$/",
    ])("accepts the explicit list %s", (value) => {
      expect(parseEnv({ ...production, [name]: value })[name as "STORE_CORS"]).toBe(value)
    })
  })

  it("leaves the wildcard rule to production", () => {
    expect(parseEnv({ NODE_ENV: "development", STORE_CORS: "*" }).STORE_CORS).toBe("*")
  })

  it("enables rate limits with the documented defaults", () => {
    expect(parseEnv({ NODE_ENV: "development" })).toMatchObject({
      RATE_LIMIT_ENABLED: true,
      RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: 10,
      RATE_LIMIT_LOGIN_MAX_PER_IP: 100,
      RATE_LIMIT_LOGIN_WINDOW_SECONDS: 900,
      RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: 5,
      RATE_LIMIT_SENSITIVE_MAX_PER_IP: 60,
      RATE_LIMIT_SENSITIVE_WINDOW_SECONDS: 3600,
      RATE_LIMIT_CATALOG_MAX_PER_IP: 600,
      RATE_LIMIT_CATALOG_WINDOW_SECONDS: 60,
    })
  })

  it("reads rate limits from strings and can switch them off", () => {
    const env = parseEnv({ RATE_LIMIT_ENABLED: "false", RATE_LIMIT_LOGIN_MAX_PER_IP: "7" })

    expect(env.RATE_LIMIT_ENABLED).toBe(false)
    expect(env.RATE_LIMIT_LOGIN_MAX_PER_IP).toBe(7)
  })

  it.each(["0", "-1", "1.5", "many"])("rejects the rate limit value %s", (value) => {
    expect(() => parseEnv({ RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: value })).toThrow(
      /RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT/,
    )
  })

  it("rejects a misspelled switch instead of leaving the limits on or off by accident", () => {
    expect(() => parseEnv({ RATE_LIMIT_ENABLED: "no" })).toThrow(/RATE_LIMIT_ENABLED/)
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
