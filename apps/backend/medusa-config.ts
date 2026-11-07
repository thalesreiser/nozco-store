import { logger } from "@medusajs/framework/logger"
import { defineConfig, loadEnv } from "@medusajs/framework/utils"
import { parseEnv } from "./src/lib/env"
import { redactingLogger } from "./src/lib/log-redaction"
import { redisModules } from "./src/lib/redis-modules"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const env = parseEnv()

module.exports = defineConfig({
  logger: redactingLogger(logger),
  projectConfig: {
    databaseUrl: env.DATABASE_URL,
    redisUrl: env.REDIS_URL,
    workerMode: env.MEDUSA_WORKER_MODE,
    http: {
      storeCors: env.STORE_CORS,
      adminCors: env.ADMIN_CORS,
      authCors: env.AUTH_CORS,
      jwtSecret: env.JWT_SECRET,
      cookieSecret: env.COOKIE_SECRET,
    },
  },
  modules: [...redisModules(env.REDIS_URL), { resolve: "./src/modules/privacy-request" }],
})
