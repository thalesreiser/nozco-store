import { describe, expect, it } from "vitest"
import {
  PRIVACY_REJECTION_REASON_MAX_LENGTH,
  privacyRequestListQuerySchema,
  privacyRequestPayloadSchema,
  privacyRequestRejectionSchema,
} from "../src/privacy"

describe("privacyRequestRejectionSchema", () => {
  it("accepts a reason up to the limit and trims it", () => {
    const longest = "a".repeat(PRIVACY_REJECTION_REASON_MAX_LENGTH)
    expect(privacyRequestRejectionSchema.parse({ reason: `  ${longest} ` })).toEqual({
      reason: longest,
    })
  })

  it.each([
    ["no reason", {}],
    ["an empty reason", { reason: "" }],
    ["a blank reason", { reason: "   " }],
    ["a reason over the limit", { reason: "a".repeat(PRIVACY_REJECTION_REASON_MAX_LENGTH + 1) }],
    ["a reason that is not text", { reason: 1 }],
    ["another field", { reason: "Motivo", status: "completed" }],
  ])("refuses %s", (_case, body) => {
    expect(privacyRequestRejectionSchema.safeParse(body).success).toBe(false)
  })
})

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
