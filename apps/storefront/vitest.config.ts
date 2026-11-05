import { defineVitestConfig } from "@nuxt/test-utils/config"

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    environmentOptions: { nuxt: { domEnvironment: "happy-dom" } },
    include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.ts"],
  },
})
