import {
  accountBucket,
  accountIdentifier,
  buildRateLimitPolicies,
  consumeRateLimit,
  ipBucket,
  isLoginPath,
  isOverLimit,
  retryAfterSeconds,
  type RateLimitPolicy,
} from "../rate-limit"
import { createMemoryStore } from "../rate-limit-store"

const policy: RateLimitPolicy = { maxPerIp: 4, maxPerAccount: 2, windowMs: 60_000 }

function attempt(
  store: ReturnType<typeof createMemoryStore>,
  ip: string,
  identifier: unknown = undefined,
) {
  return consumeRateLimit({ store, rule: "login", policy, ip, identifier })
}

describe("isOverLimit", () => {
  it("allows the request that reaches the limit and refuses the next", () => {
    expect(isOverLimit(10, 10)).toBe(false)
    expect(isOverLimit(11, 10)).toBe(true)
  })
})

describe("retryAfterSeconds", () => {
  it("rounds up and never answers zero", () => {
    expect(retryAfterSeconds(1500)).toBe(2)
    expect(retryAfterSeconds(0)).toBe(1)
  })
})

describe("ipBucket", () => {
  it("keeps an IPv4 address", () => {
    expect(ipBucket("203.0.113.7")).toBe("203.0.113.7")
  })

  it("treats an IPv4-mapped address as the IPv4 address", () => {
    expect(ipBucket("::ffff:203.0.113.7")).toBe("203.0.113.7")
  })

  it("groups a whole IPv6 /64, however the address is written", () => {
    const expected = "2001:db8:1:2::/64"

    expect(ipBucket("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe(expected)
    expect(ipBucket("2001:0DB8:0001:0002::1")).toBe(expected)
  })

  it("expands a compressed IPv6 prefix and keeps other networks apart", () => {
    expect(ipBucket("2001:db8::1")).toBe("2001:db8:0:0::/64")
    expect(ipBucket("2001:db8:1:3::1")).not.toBe(ipBucket("2001:db8:1:2::1"))
  })

  it.each([undefined, "", "not an ip"])("shares one counter for the address %s", (ip) => {
    expect(ipBucket(ip)).toBe("unknown")
  })
})

describe("accountBucket", () => {
  it("ignores case and surrounding spaces", () => {
    expect(accountBucket(" Cliente@Example.com ")).toBe(accountBucket("cliente@example.com"))
  })

  it("never exposes the address", () => {
    expect(accountBucket("cliente@example.com")).not.toContain("cliente")
  })

  it.each([undefined, null, "", "   ", 42, ["cliente@example.com"], {}])(
    "has no bucket for %j",
    (identifier) => {
      expect(accountBucket(identifier)).toBeUndefined()
    },
  )
})

describe("accountIdentifier", () => {
  it("reads the login and the reset-password fields", () => {
    expect(accountIdentifier({ email: "a@example.com", password: "x" })).toBe("a@example.com")
    expect(accountIdentifier({ identifier: "b@example.com" })).toBe("b@example.com")
  })

  it.each([undefined, null, "text"])("tolerates the body %j", (body) => {
    expect(accountIdentifier(body)).toBeUndefined()
  })
})

describe("isLoginPath", () => {
  it.each(["customer", "user"])("counts %s", (actorType) => {
    expect(isLoginPath(actorType)).toBe(true)
  })

  it.each(["token", "TOKEN", "mfa", "verification"])("ignores /auth/%s/...", (segment) => {
    expect(isLoginPath(segment)).toBe(false)
  })
})

describe("buildRateLimitPolicies", () => {
  it("turns the environment into policies, in milliseconds", () => {
    const policies = buildRateLimitPolicies({
      RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: 10,
      RATE_LIMIT_LOGIN_MAX_PER_IP: 100,
      RATE_LIMIT_LOGIN_WINDOW_SECONDS: 900,
      RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: 5,
      RATE_LIMIT_SENSITIVE_MAX_PER_IP: 60,
      RATE_LIMIT_SENSITIVE_WINDOW_SECONDS: 3600,
      RATE_LIMIT_CATALOG_MAX_PER_IP: 600,
      RATE_LIMIT_CATALOG_WINDOW_SECONDS: 60,
    })

    expect(policies.catalog).toEqual({ maxPerIp: 600, maxPerAccount: 600, windowMs: 60_000 })
    expect(policies.content).toEqual(policies.catalog)

    expect(policies.login).toEqual({ maxPerIp: 100, maxPerAccount: 10, windowMs: 900_000 })
    expect(policies.password_reset).toEqual({ maxPerIp: 60, maxPerAccount: 5, windowMs: 3_600_000 })
    expect(policies.register).toEqual(policies.password_reset)
    expect(policies.verification).toEqual(policies.password_reset)
  })
})

describe("consumeRateLimit", () => {
  it("refuses an account over its limit from any address", async () => {
    const store = createMemoryStore()

    expect((await attempt(store, "203.0.113.1", "a@example.com")).allowed).toBe(true)
    expect((await attempt(store, "203.0.113.2", "A@example.com")).allowed).toBe(true)

    const refused = await attempt(store, "203.0.113.3", "a@example.com")
    expect(refused).toMatchObject({ allowed: false, blockedBy: "account" })
    expect(refused.retryAfterSeconds).toBeGreaterThan(0)
  })

  it("leaves other accounts on the same address alone", async () => {
    const store = createMemoryStore()
    await attempt(store, "203.0.113.1", "a@example.com")
    await attempt(store, "203.0.113.1", "a@example.com")

    expect((await attempt(store, "203.0.113.1", "b@example.com")).allowed).toBe(true)
  })

  it("refuses an address over its limit across accounts", async () => {
    const store = createMemoryStore()
    for (const account of ["a", "b", "c", "d"]) {
      expect((await attempt(store, "203.0.113.1", `${account}@example.com`)).allowed).toBe(true)
    }

    expect(await attempt(store, "203.0.113.1", "e@example.com")).toMatchObject({
      allowed: false,
      blockedBy: "ip",
    })
    expect((await attempt(store, "203.0.113.2", "e@example.com")).allowed).toBe(true)
  })

  it("does not create account counters once the address is refused", async () => {
    const hit = jest.fn().mockResolvedValue({ count: 5, resetInMs: 1000 })

    await consumeRateLimit({
      store: { hit },
      rule: "login",
      policy,
      ip: "203.0.113.1",
      identifier: "a@example.com",
    })

    expect(hit).toHaveBeenCalledTimes(1)
    expect(hit).toHaveBeenCalledWith("login:ip:203.0.113.1", policy.windowMs)
  })

  it("still limits by address when the request names no account", async () => {
    const store = createMemoryStore()
    for (let index = 0; index < 4; index++) {
      expect((await attempt(store, "203.0.113.1")).allowed).toBe(true)
    }

    expect((await attempt(store, "203.0.113.1")).allowed).toBe(false)
  })

  it("keeps rules apart, so a forgotten password does not use up the logins", async () => {
    const store = createMemoryStore()
    await attempt(store, "203.0.113.1", "a@example.com")
    await attempt(store, "203.0.113.1", "a@example.com")

    const reset = await consumeRateLimit({
      store,
      rule: "password_reset",
      policy,
      ip: "203.0.113.1",
      identifier: "a@example.com",
    })

    expect(reset.allowed).toBe(true)
  })

  it("allows the account again after the window", async () => {
    let time = 0
    const store = createMemoryStore(() => time)
    await attempt(store, "203.0.113.1", "a@example.com")
    await attempt(store, "203.0.113.1", "a@example.com")
    expect((await attempt(store, "203.0.113.1", "a@example.com")).allowed).toBe(false)

    time = policy.windowMs

    expect((await attempt(store, "203.0.113.1", "a@example.com")).allowed).toBe(true)
  })
})
