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

describe("colour values in the metadata", () => {
  it("accepts a valid value and names an invalid one, leaving its value out of the error", () => {
    expect(() => assertApparelMetadata({ "color_hex:Preto": "#111111" })).not.toThrow()
    expect(() => assertApparelMetadata({ "color_hex:Preto": "valor-secreto" })).toThrow(
      "Invalid product metadata: color_hex:Preto",
    )
  })

  it("lists an invalid colour value with the garment keys", () => {
    expect(invalidApparelMetadataKeys({ weight_g: -1, "color_hex:Preto": 0 })).toEqual([
      "weight_g",
      "color_hex:Preto",
    ])
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
