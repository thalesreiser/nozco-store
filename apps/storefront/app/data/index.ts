import { createMockSource } from "#mock-source"
import { isMockAllowedIn } from "#shared/data-source"
import type { DataSourceName } from "#shared/data-source"
import { createMedusaClient } from "./api/client"
import { createApiSource } from "./api"
import { DataSourceError } from "./errors"
import type { DataSource } from "./source"

// One set per Nuxt app, which on the server means per request, so no mock cart leaks between visitors.
const sources = new WeakMap<object, Partial<Record<DataSourceName, DataSource>>>()

function createDataSource(config: ReturnType<typeof useRuntimeConfig>["public"]): DataSource {
  if (config.dataSource === "api") {
    return createApiSource(createMedusaClient(config))
  }
  if (config.dataSource === "mock" && isMockAllowedIn(config.appEnv)) {
    return createMockSource()
  }
  throw new DataSourceError(
    "source_unavailable",
    `Data source "${config.dataSource}" is not available when NUXT_PUBLIC_APP_ENV is "${config.appEnv}".`,
  )
}

/** Internal to the composables. Pages and components use `useProducts`, `useCart` and `useCheckout`. */
export function useDataSource(): DataSource {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig().public
  const name = config.dataSource as DataSourceName
  const appSources = sources.get(nuxtApp) ?? {}
  sources.set(nuxtApp, appSources)
  return (appSources[name] ??= createDataSource(config))
}

/** Drops the current app's sources, and with them the mock cart. For tests. */
export function resetDataSources(): void {
  sources.delete(useNuxtApp())
}
