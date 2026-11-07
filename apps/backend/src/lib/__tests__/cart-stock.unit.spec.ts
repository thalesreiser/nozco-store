import { totalsOfSplitVariants, withLineQuantity } from "../cart-stock"

describe("totalsOfSplitVariants", () => {
  it("adds up a variant held in more than one line", () => {
    expect(
      totalsOfSplitVariants([
        { variant_id: "a", quantity: 3 },
        { variant_id: "b", quantity: 1 },
        { variant_id: "a", quantity: 2 },
      ]),
    ).toEqual([{ variant_id: "a", quantity: 5 }])
  })

  it("has nothing to check when each variant is in one line", () => {
    expect(
      totalsOfSplitVariants([
        { variant_id: "a", quantity: 3 },
        { variant_id: "b", quantity: 9 },
      ]),
    ).toEqual([])
  })

  it("ignores lines with no variant", () => {
    expect(
      totalsOfSplitVariants([
        { variant_id: null, quantity: 3 },
        { quantity: 2 },
        { variant_id: null, quantity: 1 },
      ]),
    ).toEqual([])
  })

  it("counts a line with no quantity as one, as Medusa does", () => {
    expect(totalsOfSplitVariants([{ variant_id: "a" }, { variant_id: "a", quantity: 2 }])).toEqual([
      { variant_id: "a", quantity: 3 },
    ])
  })
})

describe("withLineQuantity", () => {
  it("changes only the given line", () => {
    const lines = [
      { id: "1", variant_id: "a", quantity: 3 },
      { id: "2", variant_id: "a", quantity: 2 },
    ]

    expect(withLineQuantity(lines, "2", 4)).toEqual([
      { id: "1", variant_id: "a", quantity: 3 },
      { id: "2", variant_id: "a", quantity: 4 },
    ])
  })
})
