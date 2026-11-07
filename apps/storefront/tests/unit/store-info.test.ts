import type { StoreProduct } from "@nozco/shared-types"
import { beforeEach, describe, expect, it } from "vitest"
import { menuLinksFrom } from "~/composables/useCatalogMenu"
import { resetDataSources } from "~/data"
import { productFixtures } from "~/data/mock/fixtures"
import { newsletterSchema } from "#shared/schemas/newsletter"
import { parsePublicRuntimeConfig } from "#shared/schemas/runtime-config"
import { isSocialLinkList, parseList, parseSocialLinks, whatsAppUrl } from "#shared/store-info"

const required = {
  apiUrl: "http://localhost:9000",
  publishableKey: "pk_test",
  appEnv: "development",
  dataSource: "mock",
}

describe("store details from runtime config", () => {
  it("yields nothing when a value is absent", () => {
    expect(whatsAppUrl("")).toBeNull()
    expect(parseSocialLinks("")).toEqual([])
    expect(parseList(" , ")).toEqual([])
  })

  it("builds the WhatsApp link only from a valid number", () => {
    expect(whatsAppUrl("5500000000000")).toBe("https://wa.me/5500000000000")
    expect(whatsAppUrl("+55 00 0000")).toBeNull()
  })

  it("reads social links and drops any that are not https", () => {
    expect(parseSocialLinks("Rede|https://example.com/a, Outra|https://example.com/b")).toEqual([
      { name: "Rede", url: "https://example.com/a" },
      { name: "Outra", url: "https://example.com/b" },
    ])
    expect(parseSocialLinks("Rede|javascript:alert(1)")).toEqual([])
    expect(parseSocialLinks("Rede|http://example.com")).toEqual([])
    expect(isSocialLinkList("Rede|https://example.com,sem-url")).toBe(false)
  })

  it("accepts a config without the optional details", () => {
    expect(() => parsePublicRuntimeConfig(required)).not.toThrow()
    expect(() =>
      parsePublicRuntimeConfig({ ...required, whatsappNumber: "", socialLinks: "" }),
    ).not.toThrow()
  })

  it("accepts a number that Nuxt converted from the environment", () => {
    expect(() =>
      parsePublicRuntimeConfig({ ...required, whatsappNumber: 5500000000000 }),
    ).not.toThrow()
  })

  it("stops the server on a malformed detail, naming it", () => {
    expect(() => parsePublicRuntimeConfig({ ...required, whatsappNumber: "abc" })).toThrow(
      /public\.whatsappNumber/,
    )
    expect(() => parsePublicRuntimeConfig({ ...required, socialLinks: "x|http://a.b" })).toThrow(
      /public\.socialLinks/,
    )
    expect(() => parsePublicRuntimeConfig({ ...required, contactEmail: "nope" })).toThrow(
      /public\.contactEmail/,
    )
  })
})

describe("newsletter schema (RF-19)", () => {
  const email = "pessoa@example.com"

  it("accepts an e-mail with consent", () => {
    expect(newsletterSchema.safeParse({ email: ` ${email} `, consent: true }).data).toEqual({
      email,
      consent: true,
    })
  })

  it("refuses without consent", () => {
    expect(newsletterSchema.safeParse({ email, consent: false }).success).toBe(false)
  })

  it("refuses an invalid e-mail", () => {
    expect(newsletterSchema.safeParse({ email: "x", consent: true }).success).toBe(false)
  })
})

describe("catalog menu", () => {
  beforeEach(() => {
    useRuntimeConfig().public.dataSource = "mock"
    resetDataSources()
  })

  it("lists each category and collection once, categories first", () => {
    expect(menuLinksFrom(productFixtures).map(({ to }) => to)).toEqual([
      "/categoria/camisetas-exemplo",
      "/categoria/moletons-exemplo",
      "/colecao/colecao-exemplo",
    ])
  })

  it("is empty without products", () => {
    expect(menuLinksFrom([] as StoreProduct[])).toEqual([])
  })
})
