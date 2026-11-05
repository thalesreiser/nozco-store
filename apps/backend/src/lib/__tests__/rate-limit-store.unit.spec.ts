import { createMemoryStore, createRedisStore, withFallback } from "../rate-limit-store"

describe("createMemoryStore", () => {
  it("counts per key and reports the time left in the window", async () => {
    let time = 1000
    const store = createMemoryStore(() => time)

    expect(await store.hit("a", 500)).toEqual({ count: 1, resetInMs: 500 })
    time = 1200
    expect(await store.hit("a", 500)).toEqual({ count: 2, resetInMs: 300 })
    expect(await store.hit("b", 500)).toEqual({ count: 1, resetInMs: 500 })
  })

  it("starts a new window when the old one ends", async () => {
    let time = 0
    const store = createMemoryStore(() => time)
    await store.hit("a", 500)

    time = 500

    expect(await store.hit("a", 500)).toEqual({ count: 1, resetInMs: 500 })
  })

  it("forgets expired counters and keeps live ones when it grows", async () => {
    let time = 0
    const store = createMemoryStore(() => time)
    await store.hit("live", 10_000)
    for (let index = 0; index < 10_000; index++) {
      await store.hit(`expired-${index}`, 1)
    }

    time = 5

    expect((await store.hit("live", 10_000)).count).toBe(2)
  })
})

describe("createRedisStore", () => {
  it("runs one atomic script on a prefixed key and returns its result", async () => {
    const client = { eval: jest.fn().mockResolvedValue([3, 1500]) }

    const hit = await createRedisStore(client).hit("login:ip:203.0.113.1", 900_000)

    expect(hit).toEqual({ count: 3, resetInMs: 1500 })
    expect(client.eval).toHaveBeenCalledTimes(1)
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining("INCR"),
      1,
      "nozco:rate-limit:login:ip:203.0.113.1",
      900_000,
    )
  })
})

describe("withFallback", () => {
  it("uses the primary store while it answers", async () => {
    const onError = jest.fn()
    const store = withFallback(
      { hit: async () => ({ count: 9, resetInMs: 1 }) },
      createMemoryStore(),
      onError,
    )

    expect((await store.hit("a", 500)).count).toBe(9)
    expect(onError).not.toHaveBeenCalled()
  })

  it("keeps counting in the fallback store and reports the failure", async () => {
    const failure = new Error("connection refused")
    const onError = jest.fn()
    const store = withFallback({ hit: () => Promise.reject(failure) }, createMemoryStore(), onError)

    expect((await store.hit("a", 500)).count).toBe(1)
    expect((await store.hit("a", 500)).count).toBe(2)
    expect(onError).toHaveBeenCalledWith(failure)
  })
})
