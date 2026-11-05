import { redisModules } from "../redis-modules"

describe("redisModules", () => {
  it("keeps Medusa's in-memory defaults without a URL", () => {
    expect(redisModules(undefined)).toEqual([])
  })

  it("enables every Redis module with the given URL", () => {
    const redisUrl = "redis://cache.example:6379"
    const modules = redisModules(redisUrl)

    expect(modules.map((module) => module.resolve)).toEqual([
      "@medusajs/medusa/cache-redis",
      "@medusajs/medusa/event-bus-redis",
      "@medusajs/medusa/workflow-engine-redis",
      "@medusajs/medusa/locking",
    ])
    expect(JSON.stringify(modules).split(redisUrl)).toHaveLength(modules.length + 1)
  })
})
