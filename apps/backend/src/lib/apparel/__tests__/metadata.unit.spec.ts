import { assertApparelMetadata } from "../metadata"

describe("assertApparelMetadata", () => {
  it("accepts missing metadata and unrelated keys", () => {
    expect(() => assertApparelMetadata(null)).not.toThrow()
    expect(() => assertApparelMetadata({ other: "x", weight_g: 180 })).not.toThrow()
  })

  it("names the field and leaves its value out of the error", () => {
    expect(() => assertApparelMetadata({ weight_g: "valor-secreto" })).toThrow(
      "Invalid product metadata: weight_g",
    )
  })
})
