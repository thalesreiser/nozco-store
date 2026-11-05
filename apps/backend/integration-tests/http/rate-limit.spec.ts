import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Redis } from "ioredis"
import { createRedisStore } from "../../src/lib/rate-limit-store"

jest.setTimeout(120 * 1000)

const validateStatus = () => true

type Api = {
  post(
    url: string,
    body: unknown,
    config: { validateStatus: () => boolean },
  ): Promise<{ status: number; data: unknown; headers: Record<string, string> }>
}

medusaIntegrationTestRunner({
  env: { RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: "2", RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: "1" },
  testSuite: ({ api }: { api: Api }) => {
    const login = (email: string) =>
      api.post("/auth/customer/emailpass", { email, password: "wrong" }, { validateStatus })

    describe("rate limits on Medusa's auth routes", () => {
      it("refuses a login over the account limit, with { code, message }", async () => {
        const email = `limit-${Date.now()}@example.com`

        expect((await login(email)).status).toBe(401)
        expect((await login(email)).status).toBe(401)

        const refused = await login(email)
        expect(refused.status).toBe(429)
        expect(refused.data).toEqual({ code: "rate_limited", message: expect.any(String) })
        expect(Number(refused.headers["retry-after"])).toBeGreaterThan(0)
      })

      it("does not count logins of another account", async () => {
        expect((await login(`other-${Date.now()}@example.com`)).status).toBe(401)
      })

      it("refuses repeated password resets of one account", async () => {
        const identifier = `reset-${Date.now()}@example.com`
        const reset = () =>
          api.post("/auth/customer/emailpass/reset-password", { identifier }, { validateStatus })

        expect((await reset()).status).toBe(201)
        expect((await reset()).status).toBe(429)
      })
    })
  },
})

// CI provides Redis. Two clients stand in for two API instances.
const redisUrl = process.env.REDIS_URL
;(redisUrl ? describe : describe.skip)("rate limit counters in Redis", () => {
  const clients = [
    new Redis(redisUrl ?? "", { lazyConnect: true }),
    new Redis(redisUrl ?? "", { lazyConnect: true }),
  ]

  afterAll(() => clients.forEach((client) => client.disconnect()))

  it("does not lose counts between instances and sets the expiry", async () => {
    const key = `integration-test:${Date.now()}`
    const stores = clients.map((client) => createRedisStore(client))

    const hits = await Promise.all(
      Array.from({ length: 50 }, (_, index) => stores[index % 2]!.hit(key, 60_000)),
    )

    expect(hits.map((hit) => hit.count).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1),
    )
    for (const hit of hits) {
      expect(hit.resetInMs).toBeGreaterThan(0)
      expect(hit.resetInMs).toBeLessThanOrEqual(60_000)
    }
  })
})
