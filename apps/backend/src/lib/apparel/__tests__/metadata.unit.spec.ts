import { assertApparelMetadata, invalidApparelMetadataKeys } from "../metadata"

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

describe("invalidApparelMetadataKeys", () => {
  it("lists only the keys that fail the schema", () => {
    expect(
      invalidApparelMetadataKeys({ fabric: "x", other: "y", weight_g: -1, length_cm: "z" }),
    ).toEqual(["weight_g", "length_cm"])
  })

  it("is empty for valid or missing metadata", () => {
    expect(invalidApparelMetadataKeys({ weight_g: 180 })).toEqual([])
    expect(invalidApparelMetadataKeys(null)).toEqual([])
  })
})
