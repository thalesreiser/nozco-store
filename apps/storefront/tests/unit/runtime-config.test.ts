import { describe, expect, it } from "vitest"
import { parsePublicRuntimeConfig } from "#shared/schemas/runtime-config"

const validConfig = {
  apiUrl: "https://api.example.com",
  publishableKey: "pk_test",
  appEnv: "production",
}

describe("parsePublicRuntimeConfig", () => {
  it("accepts a complete config", () => {
    expect(parsePublicRuntimeConfig(validConfig)).toEqual(validConfig)
  })

  it.each([
    ["apiUrl", ""],
    ["apiUrl", "not-a-url"],
    ["apiUrl", "ftp://api.example.com"],
    ["publishableKey", ""],
    ["appEnv", ""],
    ["appEnv", "staging"],
  ])("rejects %s = %j and names the field", (field, value) => {
    expect(() => parsePublicRuntimeConfig({ ...validConfig, [field]: value })).toThrow(
      `public.${field}`,
    )
  })

  it("reports every invalid field at once", () => {
    expect(() => parsePublicRuntimeConfig({})).toThrow(
      /public\.apiUrl[\s\S]*public\.publishableKey[\s\S]*public\.appEnv/,
    )
  })
})
