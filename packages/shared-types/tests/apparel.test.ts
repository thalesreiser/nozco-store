import { describe, expect, it } from "vitest"
import {
  apparelMetadataSchema,
  colorHexFrom,
  colorHexSchema,
  compareSizes,
  invalidColorHexKeys,
} from "../src/index.js"

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

describe("compareSizes", () => {
  it("follows the grid, not the text order", () => {
    expect(["GG", "XGG", "P", "G", "M"].sort(compareSizes)).toEqual(["P", "M", "G", "GG", "XGG"])
  })

  it("puts unknown sizes after the grid, in text order", () => {
    expect(["Único", "G", "XXGG", "Tam-10", "P", "Tam-2"].sort(compareSizes)).toEqual([
      "P",
      "G",
      "Tam-2",
      "Tam-10",
      "Único",
      "XXGG",
    ])
  })
})

describe("colour values", () => {
  it.each(["#000000", "#a1b2c3", "#FFFFFF"])("accepts %s", (value) => {
    expect(colorHexSchema.parse(value)).toBe(value.toLowerCase())
  })

  it.each(["000000", "#fff", "#12345", "#1234567", "#gggggg", "red", "rgb(0,0,0)", "", 0, null])(
    "refuses %j",
    (value) => {
      expect(colorHexSchema.safeParse(value).success).toBe(false)
    },
  )

  it("reads the value by the exact colour name, from a flat key", () => {
    const metadata = { "color_hex:Preto": "#111111", "color_hex:Azul-marinho": "#001F3F" }
    expect(colorHexFrom(metadata, "Preto")).toBe("#111111")
    expect(colorHexFrom(metadata, "Azul-marinho")).toBe("#001f3f")
    expect(colorHexFrom(metadata, "preto")).toBeNull()
  })

  it("answers null when the value is absent or invalid", () => {
    expect(colorHexFrom({ "color_hex:Preto": "preto" }, "Preto")).toBeNull()
    expect(colorHexFrom({ "color_hex:Preto": { hex: "#111111" } }, "Preto")).toBeNull()
    expect(colorHexFrom({}, "Preto")).toBeNull()
    expect(colorHexFrom(null, "Preto")).toBeNull()
  })

  it("names only the colour-value keys that are invalid", () => {
    const metadata = {
      "color_hex:Preto": "#111111",
      "color_hex:Azul": 0,
      fabric: "Exemplo",
      x: "y",
    }
    expect(invalidColorHexKeys(metadata)).toEqual(["color_hex:Azul"])
    expect(invalidColorHexKeys(null)).toEqual([])
  })
})
