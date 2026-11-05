import { defineVitestConfig } from "@nuxt/test-utils/config"

// nuxt.config.ts reads these when it loads, and the tests run on the mock source.
process.env.NUXT_PUBLIC_DATA_SOURCE = "mock"
process.env.NUXT_PUBLIC_APP_ENV = "development"

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    environmentOptions: { nuxt: { domEnvironment: "happy-dom" } },
    // Starting the Nuxt app takes close to the 10 s default here, and passes it on a busy machine.
    hookTimeout: 60_000,
    include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.ts"],
  },
})
