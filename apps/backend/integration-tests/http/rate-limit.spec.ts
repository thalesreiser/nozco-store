import type { MedusaContainer } from "@medusajs/framework/types"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Redis } from "ioredis"
import { createRedisStore } from "../../src/lib/rate-limit-store"
import { queryList } from "../../src/lib/store-setup/query"
import { setupStore } from "../../src/lib/store-setup/setup-store"

jest.setTimeout(120 * 1000)

const validateStatus = () => true

type Answer = { status: number; data: unknown; headers: Record<string, string> }

type Api = {
  post(url: string, body: unknown, config: { validateStatus: () => boolean }): Promise<Answer>
  get(
    url: string,
    config: {
      headers: Record<string, string>
      params: Record<string, string>
      validateStatus: () => boolean
    },
  ): Promise<Answer>
}

medusaIntegrationTestRunner({
  env: {
    RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: "2",
    RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: "1",
    RATE_LIMIT_CATALOG_MAX_PER_IP: "3",
  },
  testSuite: ({ api, getContainer }: { api: Api; getContainer: () => MedusaContainer }) => {
    describe("rate limit on the store catalog", () => {
      it("counts the three routes together and refuses with { code, message }", async () => {
        const container = getContainer()
        const setup = await setupStore(container)
        const [key] = await queryList<{ token: string }>(container, {
          entity: "api_key",
          fields: ["token"],
          filters: { id: setup.publishableApiKeyId },
        })
        const read = (path: string) =>
          api.get(path, {
            headers: { "x-publishable-api-key": key?.token ?? "" },
            params: { region_id: setup.regionId },
            validateStatus,
          })
        const routes = [
          "/store/catalog/products",
          "/store/catalog/products/any-handle",
          "/store/catalog/facets",
        ]

        // Counters may be in Redis, shared with other specs, so the limit may be reached earlier.
        for (const path of routes) {
          expect([200, 404, 429]).toContain((await read(path)).status)
        }
        for (const path of routes) {
          const refused = await read(path)
          expect(refused.status).toBe(429)
          expect(refused.data).toEqual({ code: "rate_limited", message: expect.any(String) })
          expect(Number(refused.headers["retry-after"])).toBeGreaterThan(0)
        }
      })

      it("limits the home content route too", async () => {
        const container = getContainer()
        const setup = await setupStore(container)
        const [key] = await queryList<{ token: string }>(container, {
          entity: "api_key",
          fields: ["token"],
          filters: { id: setup.publishableApiKeyId },
        })
        const read = () =>
          api.get("/store/content/home", {
            headers: { "x-publishable-api-key": key?.token ?? "" },
            params: {},
            validateStatus,
          })

        // Counters may be in Redis, shared with other specs, so the limit may be reached earlier.
        for (let attempt = 0; attempt < 3; attempt += 1) {
          expect([200, 429]).toContain((await read()).status)
        }
        const refused = await read()
        expect(refused.status).toBe(429)
        expect(refused.data).toEqual({ code: "rate_limited", message: expect.any(String) })
      })
    })

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
