import { fileURLToPath } from "node:url"
import { defineVitestProject } from "@nuxt/test-utils/config"
import { defineConfig } from "vitest/config"

// nuxt.config.ts reads these when it loads, and the tests run on the mock source.
process.env.NUXT_PUBLIC_DATA_SOURCE = "mock"
process.env.NUXT_PUBLIC_APP_ENV = "development"

export default defineConfig({
  test: {
    projects: [
      await defineVitestProject({
        test: {
          name: "app",
          environment: "nuxt",
          environmentOptions: { nuxt: { domEnvironment: "happy-dom" } },
          // Starting the Nuxt app takes close to the 10 s default here, and passes it on a busy machine.
          hookTimeout: 60_000,
          include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.ts"],
        },
      }),
      {
        // Outside Nuxt's Vite pipeline, which would rewrite server code to the app's auto-imports:
        // createError and setResponseStatus also exist there, and behave differently.
        resolve: { alias: { "#shared": fileURLToPath(new URL("./shared", import.meta.url)) } },
        test: { name: "server", environment: "node", include: ["tests/server/**/*.test.ts"] },
      },
      { test: { name: "design", environment: "node", include: ["tests/design/**/*.test.ts"] } },
    ],
  },
})
