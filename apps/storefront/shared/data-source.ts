// No Zod here on purpose: the browser bundle imports this file, and the checks below are one line each.

export const DATA_SOURCES = ["mock", "api"] as const
export type DataSourceName = (typeof DATA_SOURCES)[number]

/** Environments where the fictional fixtures may exist. Anything else, or nothing, keeps them out. */
const MOCK_ENVIRONMENTS: readonly string[] = ["development", "preview"]

export function isMockAllowedIn(appEnv: string | undefined): boolean {
  return appEnv !== undefined && MOCK_ENVIRONMENTS.includes(appEnv)
}

/**
 * Decides at build time whether the fixtures enter the bundle, from the same variables the runtime
 * reads. A build only contains them when it explicitly asks for `mock` outside production, and a build
 * that asks for `mock` anywhere else stops here instead of shipping them.
 */
export function shouldBundleMockSource(env: Record<string, string | undefined>): boolean {
  const appEnv = env["NUXT_PUBLIC_APP_ENV"]
  if (env["NUXT_PUBLIC_DATA_SOURCE"] !== "mock") return false
  if (isMockAllowedIn(appEnv)) return true
  throw new Error(
    `NUXT_PUBLIC_DATA_SOURCE=mock needs NUXT_PUBLIC_APP_ENV=development or preview, got "${appEnv ?? ""}". The mock source is refused in production.`,
  )
}
