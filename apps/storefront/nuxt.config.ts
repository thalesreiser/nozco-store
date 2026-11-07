import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { shouldBundleMockSource } from "./shared/data-source"
import { GALLERY_PATH, isGalleryAllowedIn } from "./shared/gallery"

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
      // Optional store details, absent from the public repository. An empty one hides its element.
      whatsappNumber: "",
      legalName: "",
      cnpj: "",
      legalAddress: "",
      contactEmail: "",
      socialLinks: "",
      paymentMethods: "",
    },
  },
  // The store and its server routes share one origin, so no response needs CORS headers.
  // Fonts are self-hosted, so the default font-src (which allows any https: origin) is narrowed.
  security: {
    corsHandler: false,
    headers: { contentSecurityPolicy: { "font-src": ["'self'"] } },
  },
  routeRules: {
    // The XSS validator refuses text containing `<`, which is valid in a password. The route validates
    // with Zod and only forwards the value to Medusa as JSON.
    "/api/auth/login": { security: { xssValidator: false } },
  },
  hooks: {
    // Leaves the internal gallery out of the build, so production has no route and no chunk for it.
    "pages:extend"(pages) {
      if (isGalleryAllowedIn(process.env.NUXT_PUBLIC_APP_ENV)) return
      const index = pages.findIndex((page) => page.path === GALLERY_PATH)
      if (index !== -1) pages.splice(index, 1)
    },
    // Nuxt only adds its own handler when none is set, so this one is put in front of it from here.
    "nitro:config"(config) {
      const nuxtHandlers = config.errorHandler ? [config.errorHandler].flat() : []
      // Forward slashes: Nitro writes this path into an import statement, also on Windows.
      const bffHandler = fileURLToPath(new URL("./server/error.ts", import.meta.url))
      config.errorHandler = [bffHandler.replaceAll("\\", "/"), ...nuxtHandlers]
    },
  },
  i18n: {
    defaultLocale: "pt-BR",
    strategy: "no_prefix",
    // One locale, so no detection and no language cookie on responses that will be cached.
    detectBrowserLanguage: false,
    locales: [{ code: "pt-BR", language: "pt-BR", file: "pt-BR.json", name: "Português (Brasil)" }],
  },
})
