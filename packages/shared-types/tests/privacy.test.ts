import { describe, expect, it } from "vitest"
import { privacyRequestListQuerySchema, privacyRequestPayloadSchema } from "../src/privacy"

describe("privacyRequestPayloadSchema", () => {
  it.each(["export", "deletion"])("accepts %s", (type) => {
    expect(privacyRequestPayloadSchema.parse({ type })).toEqual({ type })
  })

  it("refuses an unknown type", () => {
    expect(privacyRequestPayloadSchema.safeParse({ type: "correction" }).success).toBe(false)
  })

  it("refuses a body that names a customer", () => {
    const body = { type: "export", customer_id: "cus_other" }

    expect(privacyRequestPayloadSchema.safeParse(body).success).toBe(false)
  })
})

describe("privacyRequestListQuerySchema", () => {
  it("applies the page defaults", () => {
    expect(privacyRequestListQuerySchema.parse({})).toEqual({ limit: 20, offset: 0 })
  })

  it("reads numbers from the query string", () => {
    expect(privacyRequestListQuerySchema.parse({ limit: "5", offset: "10" })).toEqual({
      limit: 5,
      offset: 10,
    })
  })

  it.each([{ limit: "101" }, { limit: "0" }, { offset: "-1" }, { status: "done" }, { q: "x" }])(
    "refuses %j",
    (query) => {
      expect(privacyRequestListQuerySchema.safeParse(query).success).toBe(false)
    },
  )
})
