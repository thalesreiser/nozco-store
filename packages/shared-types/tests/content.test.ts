import { describe, expect, it } from "vitest"
import {
  contentListQuerySchema,
  homeAnnouncementPayloadSchema,
  homeBannerPayloadSchema,
  storeHomeContentRequestSchema,
} from "../src/index.js"

const banner = {
  title: "Coleção de exemplo",
  image_url: "https://cdn.example.com/banner.jpg",
  image_alt: "Camiseta preta de exemplo",
  cta_label: "Ver coleção",
  cta_url: "/colecoes/exemplo",
  rank: 0,
  is_published: true,
  starts_at: null,
  ends_at: null,
}
const announcement = {
  message: "Aviso de exemplo",
  link_url: null,
  rank: 0,
  is_published: false,
  starts_at: "2026-12-01T00:00:00-03:00",
  ends_at: "2026-12-02T00:00:00Z",
}

const bannerAccepts = (change: object) =>
  homeBannerPayloadSchema.safeParse({ ...banner, ...change }).success
const announcementAccepts = (change: object) =>
  homeAnnouncementPayloadSchema.safeParse({ ...announcement, ...change }).success

describe("homeBannerPayloadSchema", () => {
  it("accepts a banner and turns its dates into Date values", () => {
    const parsed = homeBannerPayloadSchema.parse({ ...banner, ends_at: "2026-12-01T00:00:00Z" })
    expect(parsed.ends_at).toEqual(new Date("2026-12-01T00:00:00Z"))
  })

  it.each(["image_alt", "image_url", "title"])("requires %s", (field) => {
    const rest = Object.fromEntries(Object.entries(banner).filter(([key]) => key !== field))
    expect(homeBannerPayloadSchema.safeParse(rest).success).toBe(false)
  })

  it.each(["", "   "])("refuses the blank alt text %j", (image_alt) => {
    expect(bannerAccepts({ image_alt })).toBe(false)
  })

  it.each([
    "http://cdn.example.com/a.jpg",
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "/banner.jpg",
    "https://",
  ])("refuses the image URL %s", (image_url) => {
    expect(bannerAccepts({ image_url })).toBe(false)
  })

  it.each(["/", "/colecoes/exemplo?ordem=novos", "https://example.com/promo"])(
    "accepts the link %s",
    (cta_url) => {
      expect(bannerAccepts({ cta_url })).toBe(true)
    },
  )

  it.each([
    "javascript:alert(1)",
    "//evil.example.com",
    "/\\evil.example.com",
    "http://example.com",
    "colecoes",
    "/a b",
  ])("refuses the link %s", (cta_url) => {
    expect(bannerAccepts({ cta_url })).toBe(false)
  })

  it("takes the call to action whole or not at all", () => {
    expect(bannerAccepts({ cta_label: null, cta_url: null })).toBe(true)
    expect(bannerAccepts({ cta_label: null })).toBe(false)
    expect(bannerAccepts({ cta_url: null })).toBe(false)
  })

  it("refuses a window that ends before it starts, and an unknown field", () => {
    const later = "2026-12-02T00:00:00Z"
    const earlier = "2026-12-01T00:00:00Z"
    expect(bannerAccepts({ starts_at: later, ends_at: earlier })).toBe(false)
    expect(bannerAccepts({ starts_at: later, ends_at: later })).toBe(false)
    expect(bannerAccepts({ starts_at: earlier, ends_at: later })).toBe(true)
    expect(bannerAccepts({ id: "x" })).toBe(false)
  })

  it.each([-1, 1.5, 10000])("refuses the rank %d", (rank) => {
    expect(bannerAccepts({ rank })).toBe(false)
  })
})

describe("homeAnnouncementPayloadSchema", () => {
  it("accepts an announcement with or without a link", () => {
    expect(announcementAccepts({})).toBe(true)
    expect(announcementAccepts({ link_url: "/frete" })).toBe(true)
  })

  it("refuses a blank message, an unsafe link and a date without a time zone", () => {
    expect(announcementAccepts({ message: " " })).toBe(false)
    expect(announcementAccepts({ link_url: "javascript:alert(1)" })).toBe(false)
    expect(announcementAccepts({ ends_at: "2026-12-02T00:00:00" })).toBe(false)
  })

  it("refuses a window that ends before it starts", () => {
    expect(announcementAccepts({ ends_at: "2026-11-01T00:00:00Z" })).toBe(false)
  })
})

describe("the query schemas", () => {
  it("defaults the back-office page and caps it", () => {
    expect(contentListQuerySchema.parse({})).toEqual({ limit: 50, offset: 0 })
    expect(contentListQuerySchema.safeParse({ limit: "101" }).success).toBe(false)
  })

  it("refuses a parameter on the store route", () => {
    expect(storeHomeContentRequestSchema.safeParse({}).success).toBe(true)
    expect(storeHomeContentRequestSchema.safeParse({ preview: "1" }).success).toBe(false)
  })
})
