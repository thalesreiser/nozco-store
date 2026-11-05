import { defineConfig, devices } from "@playwright/test"

const port = 3100
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  // Serves the production build. `pnpm test:e2e` at the monorepo root builds it first (turbo.json).
  webServer: {
    command: "node .output/server/index.mjs",
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: String(port),
      NUXT_PUBLIC_API_URL: "http://localhost:9000",
      NUXT_PUBLIC_PUBLISHABLE_KEY: "pk_e2e_placeholder",
      NUXT_PUBLIC_APP_ENV: "preview",
      NUXT_PUBLIC_DATA_SOURCE: "api",
    },
  },
})
