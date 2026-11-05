import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { shouldBundleMockSource } from "./shared/data-source"

// The alias decides at build time, so a build without fixtures has no import path that reaches them.
const mockSourceFile = shouldBundleMockSource(process.env) ? "index" : "excluded"

export default defineNuxtConfig({
  compatibilityDate: "2026-11-01",
  alias: {
    "#mock-source": fileURLToPath(new URL(`./app/data/mock/${mockSourceFile}`, import.meta.url)),
  },
  modules: ["@pinia/nuxt", "nuxt-security", "@nuxtjs/i18n", "shadcn-nuxt"],
  css: ["~/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  shadcn: { prefix: "", componentDir: "@/components/ui" },
  app: {
    head: {
      htmlAttrs: { lang: "pt-BR" },
      title: "NozCo",
    },
  },
  typescript: {
    strict: true,
    // Nuxt 4 generates separate projects (app, server, shared, node). Test and tool config files
    // are not in any of them by default, and vue-tsc and typed lint would then skip them.
    tsConfig: { include: ["../tests/**/*.ts"] },
    nodeTsConfig: { include: ["../vitest.config.ts", "../playwright.config.ts"] },
  },
  // Empty on purpose: every value comes from NUXT_PUBLIC_* variables, and
  // server/plugins/validate-runtime-config.ts stops the server if one is missing or invalid.
  runtimeConfig: {
    public: {
      apiUrl: "",
      publishableKey: "",
      appEnv: "",
      dataSource: "",
    },
  },
  // The store and its server routes share one origin, so no response needs CORS headers.
  security: { corsHandler: false },
  i18n: {
    defaultLocale: "pt-BR",
    strategy: "no_prefix",
    // One locale, so no detection and no language cookie on responses that will be cached.
    detectBrowserLanguage: false,
    locales: [{ code: "pt-BR", language: "pt-BR", file: "pt-BR.json", name: "Português (Brasil)" }],
  },
})
