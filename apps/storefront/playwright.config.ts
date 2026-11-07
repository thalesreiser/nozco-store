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
      NUXT_PUBLIC_API_URL: process.env.NUXT_PUBLIC_API_URL ?? "http://localhost:9000",
      NUXT_PUBLIC_PUBLISHABLE_KEY: process.env.NUXT_PUBLIC_PUBLISHABLE_KEY ?? "pk_e2e_placeholder",
      NUXT_PUBLIC_APP_ENV: process.env.NUXT_PUBLIC_APP_ENV ?? "preview",
      NUXT_PUBLIC_DATA_SOURCE: process.env.NUXT_PUBLIC_DATA_SOURCE ?? "api",
      // Fictional store details, so the footer shows every element (tests/e2e/global-layout.spec.ts).
      NUXT_PUBLIC_WHATSAPP_NUMBER: "5500000000000",
      NUXT_PUBLIC_LEGAL_NAME: "[Razão social fictícia]",
      NUXT_PUBLIC_CNPJ: "00.000.000/0000-00",
      NUXT_PUBLIC_LEGAL_ADDRESS: "[Rua de Exemplo, 100, Cidade Exemplo]",
      NUXT_PUBLIC_CONTACT_EMAIL: "contato@example.com",
      NUXT_PUBLIC_SOCIAL_LINKS: "[Rede A]|https://example.com/a,[Rede B]|https://example.com/b",
      NUXT_PUBLIC_PAYMENT_METHODS: "[Forma de pagamento A],[Forma de pagamento B]",
    },
  },
})
