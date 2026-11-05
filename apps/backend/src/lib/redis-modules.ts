/**
 * Medusa modules that need Redis. Without a URL Medusa keeps its in-memory defaults, which only
 * work for a single process, so a server and a worker must share one.
 */
export function redisModules(redisUrl: string | undefined) {
  if (!redisUrl) {
    return []
  }
  return [
    { resolve: "@medusajs/medusa/cache-redis", options: { redisUrl } },
    { resolve: "@medusajs/medusa/event-bus-redis", options: { redisUrl } },
    { resolve: "@medusajs/medusa/workflow-engine-redis", options: { redis: { redisUrl } } },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            id: "locking-redis",
            resolve: "@medusajs/medusa/locking-redis",
            is_default: true,
            options: { redisUrl },
          },
        ],
      },
    },
  ]
}
