import { readFileSync } from "node:fs"
import { afterEach, describe, expect, expectTypeOf, it } from "vitest"
import { shouldBundleMockSource } from "#shared/data-source"
import { resetDataSources, useDataSource } from "~/data"
import { createApiSource } from "~/data/api"
import { createMedusaClient } from "~/data/api/client"
import { DataSourceError } from "~/data/errors"
import { createMockSource } from "~/data/mock"
import { createMockSource as createExcludedMockSource } from "~/data/mock/excluded"
import { FIXTURE_MARKER } from "~/data/mock/fixtures"
import type { CartApi, CheckoutApi, DataSource, ProductsApi } from "~/data/source"

function useSource(name: string) {
  useRuntimeConfig().public.dataSource = name
  resetDataSources()
  return {
    content: useDataSource().content,
    products: useProducts(),
    cart: useCart(),
    checkout: useCheckout(),
  }
}

function shape(source: object) {
  return Object.entries(source).map(([group, api]) => [group, Object.keys(api as object).sort()])
}

afterEach(() => {
  const config = useRuntimeConfig().public
  config.dataSource = "mock"
  config.appEnv = "development"
  resetDataSources()
})

describe("swapping the data source", () => {
  it("keeps the composable signatures in the type system", () => {
    expectTypeOf(useProducts).returns.toEqualTypeOf<ProductsApi>()
    expectTypeOf(useCart).returns.toEqualTypeOf<CartApi>()
    expectTypeOf(useCheckout).returns.toEqualTypeOf<CheckoutApi>()
    expectTypeOf(createMockSource).returns.toEqualTypeOf<DataSource>()
    expectTypeOf(createApiSource).returns.toEqualTypeOf<DataSource>()
    expectTypeOf(createExcludedMockSource).toEqualTypeOf(createMockSource)
  })

  it("exposes the same methods through the composables on either source", () => {
    const mock = useSource("mock")
    const api = useSource("api")

    expect(shape(api)).toEqual(shape(mock))
    expect(api.products).not.toBe(mock.products)
    for (const group of Object.values(api)) {
      for (const method of Object.values(group)) expect(method).toBeTypeOf("function")
    }
  })

  it("selects the source named by the runtime config", async () => {
    await expect(useSource("mock").products.listProducts()).resolves.toBeDefined()
    await expect(useSource("api").products.listProducts()).rejects.toBeInstanceOf(DataSourceError)
  })

  it("fails instead of serving mock data in production", () => {
    useRuntimeConfig().public.appEnv = "production"
    expect(() => useSource("mock")).toThrow(DataSourceError)
  })

  it("fails on an unknown source", () => {
    expect(() => useSource("fixtures")).toThrow(/"fixtures" is not available/)
  })
})

describe("api source", () => {
  const source = createApiSource(
    createMedusaClient({ apiUrl: "http://localhost:9000", publishableKey: "pk_test" }),
  )

  const calls = Object.entries(source).flatMap(([group, api]) =>
    Object.entries(api as Record<string, () => Promise<unknown>>).map(
      ([method, call]) => [`${group}.${method}`, method, call] as const,
    ),
  )

  it.each(calls)("%s rejects with a typed not_implemented error", async (_name, method, call) => {
    const error: unknown = await call().catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(DataSourceError)
    expect(error).toMatchObject({ code: "not_implemented" })
    expect((error as Error).message).toContain(method)
    expect((error as Error).message).toMatch(/FE-\d\d\.\d/)
  })
})

describe("fixtures in the build", () => {
  it("uses the marker that the build check looks for", () => {
    const script = readFileSync("scripts/check-fixtures.mjs", "utf8")
    expect(script).toContain(`"${FIXTURE_MARKER}"`)
  })

  it("has a stand-in that fails with a typed error", () => {
    expect(() => createExcludedMockSource()).toThrow(DataSourceError)
  })

  it.each([
    [undefined, undefined],
    [undefined, "production"],
    ["api", "production"],
    ["api", "preview"],
  ])("leaves them out for source %s in %s", (source, appEnv) => {
    expect(
      shouldBundleMockSource({ NUXT_PUBLIC_DATA_SOURCE: source, NUXT_PUBLIC_APP_ENV: appEnv }),
    ).toBe(false)
  })

  it.each(["development", "preview"])("includes them for mock in %s", (appEnv) => {
    expect(
      shouldBundleMockSource({ NUXT_PUBLIC_DATA_SOURCE: "mock", NUXT_PUBLIC_APP_ENV: appEnv }),
    ).toBe(true)
  })

  it.each(["production", "staging", undefined])("stops a mock build in %s", (appEnv) => {
    expect(() =>
      shouldBundleMockSource({ NUXT_PUBLIC_DATA_SOURCE: "mock", NUXT_PUBLIC_APP_ENV: appEnv }),
    ).toThrow(/refused in production/)
  })
})
