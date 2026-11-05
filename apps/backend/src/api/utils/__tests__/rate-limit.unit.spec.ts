import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createMemoryStore } from "../../../lib/rate-limit-store"
import { buildRateLimitPolicies } from "../../../lib/rate-limit"
import { applyRateLimit } from "../rate-limit"

function setup(enabled = true) {
  const logger = { warn: jest.fn() }
  const config = {
    enabled,
    logger,
    store: createMemoryStore(),
    policies: buildRateLimitPolicies({
      RATE_LIMIT_LOGIN_MAX_PER_ACCOUNT: 1,
      RATE_LIMIT_LOGIN_MAX_PER_IP: 100,
      RATE_LIMIT_LOGIN_WINDOW_SECONDS: 900,
      RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: 1,
      RATE_LIMIT_SENSITIVE_MAX_PER_IP: 100,
      RATE_LIMIT_SENSITIVE_WINDOW_SECONDS: 3600,
    }),
  }
  return { config, logger }
}

async function send(
  config: ReturnType<typeof setup>["config"],
  params: Record<string, string> = { actor_type: "customer" },
) {
  const res = { setHeader: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() }
  const next = jest.fn()
  const req = {
    ip: "203.0.113.1",
    params,
    body: { email: "cliente@example.com", password: "fictional-password" },
  } as unknown as MedusaRequest
  await applyRateLimit(
    "login",
    config,
    req,
    res as unknown as MedusaResponse,
    next as unknown as MedusaNextFunction,
  )
  return { res, next }
}

describe("applyRateLimit", () => {
  it("lets a request under the limit through", async () => {
    const { res, next } = await send(setup().config)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("answers 429 with Retry-After and { code, message } over the limit", async () => {
    const { config } = setup()
    await send(config)

    const { res, next } = await send(config)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(429)
    expect(res.setHeader).toHaveBeenCalledWith("Retry-After", expect.stringMatching(/^[1-9]\d*$/))
    expect(res.json).toHaveBeenCalledWith({
      code: "rate_limited",
      message: expect.any(String),
    })
  })

  it("logs the rule and the counter, never the account or the address", async () => {
    const { config, logger } = setup()
    await send(config)
    await send(config)

    expect(logger.warn).toHaveBeenCalledWith("Rate limit exceeded: login (account)")
  })

  it("does not count Medusa routes that only look like a login", async () => {
    const { config } = setup()
    for (let index = 0; index < 3; index++) {
      const { next } = await send(config, { actor_type: "token", auth_provider: "refresh" })
      expect(next).toHaveBeenCalledTimes(1)
    }
  })

  it("does nothing when switched off", async () => {
    const { config } = setup(false)
    await send(config)

    const { res, next } = await send(config)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })
})
