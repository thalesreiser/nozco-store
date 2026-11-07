import { describe, expect, it } from "vitest"
import { apparelMetadataSchema } from "../src/index.js"

describe("apparelMetadataSchema", () => {
  it("accepts a complete garment", () => {
    const metadata = {
      fabric: "Tecido de exemplo",
      care: "Lavar à mão",
      weight_g: 180,
      length_cm: 30,
      width_cm: 25,
      height_cm: 2.5,
    }
    expect(apparelMetadataSchema.parse(metadata)).toEqual(metadata)
  })

  it("accepts a product with no metadata yet, since the specs are pending", () => {
    expect(apparelMetadataSchema.parse({})).toEqual({})
  })

  it("keeps only the garment fields when parsing", () => {
    expect(apparelMetadataSchema.parse({ fabric: "Tecido de exemplo", fixture: "x" })).toEqual({
      fabric: "Tecido de exemplo",
    })
  })

  it.each([
    ["fabric", ""],
    ["fabric", 100],
    ["care", "   "],
    ["weight_g", 0],
    ["weight_g", 180.5],
    ["weight_g", "180"],
    ["length_cm", -1],
    ["width_cm", 0],
    ["height_cm", "2"],
  ])("rejects %s = %j", (key, value) => {
    expect(apparelMetadataSchema.safeParse({ [key]: value }).success).toBe(false)
  })
})
