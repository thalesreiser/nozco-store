import { describe, expect, it } from "vitest"
import { cartQuantitiesSchema } from "../src/index.js"

const accepts = (body: unknown) => cartQuantitiesSchema.safeParse(body).success

describe("cartQuantitiesSchema", () => {
  it.each([1.5, 0.5, -1.5, 0.1])("rejects the fractional quantity %d", (quantity) => {
    expect(accepts({ variant_id: "variant_1", quantity })).toBe(false)
  })

  it.each([1.5, -0.5])("rejects %d in any item of a new cart", (quantity) => {
    expect(accepts({ items: [{ quantity: 1 }, { quantity }] })).toBe(false)
  })

  it.each([1, 2, 100])("accepts the whole quantity %d", (quantity) => {
    expect(accepts({ quantity })).toBe(true)
    expect(accepts({ items: [{ quantity }] })).toBe(true)
  })

  it("accepts zero, which removes a line", () => {
    expect(accepts({ quantity: 0 })).toBe(true)
  })

  it.each([
    ["a negative whole number", { quantity: -1 }],
    ["a string", { quantity: "1.5" }],
    ["no quantity", { region_id: "reg_1" }],
    ["items that are not a list", { items: "x" }],
    ["an item that is not an object", { items: [null, "x"] }],
  ])("leaves %s to Medusa's validators", (_name, body) => {
    expect(accepts(body)).toBe(true)
  })

  it("keeps the other fields of the body", () => {
    const body = { variant_id: "variant_1", quantity: 1, metadata: { exemplo: true } }

    expect(cartQuantitiesSchema.parse(body)).toEqual(body)
  })
})
