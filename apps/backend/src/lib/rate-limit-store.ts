import type { RateLimitHit, RateLimitStore } from "./rate-limit"

const KEY_PREFIX = "nozco:rate-limit:"
const MEMORY_SWEEP_SIZE = 10_000

/**
 * Atomic, so instances cannot lose a count and a crash cannot leave a counter without an expiry.
 * Medusa's cache module only offers get and set, which would lose counts between instances.
 */
const HIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
return { count, redis.call("PTTL", KEYS[1]) }
`

/** The part of an ioredis client this store uses. */
export interface RedisEvalClient {
  eval(script: string, numKeys: number, key: string, windowMs: number): Promise<unknown>
}

/** Shared by every instance that uses the same Redis. */
export function createRedisStore(client: RedisEvalClient): RateLimitStore {
  return {
    async hit(key, windowMs) {
      const [count, resetInMs] = (await client.eval(
        HIT_SCRIPT,
        1,
        `${KEY_PREFIX}${key}`,
        windowMs,
      )) as [number, number]
      return { count, resetInMs }
    },
  }
}

/** Counts per process: right for one instance, and the fallback while Redis is unavailable. */
export function createMemoryStore(now: () => number = Date.now): RateLimitStore {
  const counters = new Map<string, { count: number; resetAt: number }>()

  return {
    hit(key, windowMs) {
      const time = now()
      if (counters.size >= MEMORY_SWEEP_SIZE) {
        for (const [storedKey, counter] of counters) {
          if (counter.resetAt <= time) {
            counters.delete(storedKey)
          }
        }
      }
      const current = counters.get(key)
      const counter =
        current && current.resetAt > time
          ? { count: current.count + 1, resetAt: current.resetAt }
          : { count: 1, resetAt: time + windowMs }
      counters.set(key, counter)
      return Promise.resolve({ count: counter.count, resetInMs: counter.resetAt - time })
    },
  }
}

/**
 * A Redis outage must not stop customers from signing in, and must not switch the limits off either,
 * so each process keeps counting on its own until Redis answers again.
 */
export function withFallback(
  primary: RateLimitStore,
  fallback: RateLimitStore,
  onError: (error: unknown) => void,
): RateLimitStore {
  return {
    async hit(key, windowMs): Promise<RateLimitHit> {
      try {
        return await primary.hit(key, windowMs)
      } catch (error) {
        onError(error)
        return fallback.hit(key, windowMs)
      }
    },
  }
}
