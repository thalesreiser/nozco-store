import { adminView, customerView, type PrivacyRequestRow, reviewRefusal } from "../requests"

const row: PrivacyRequestRow = {
  id: "pvreq_1",
  customer_id: "cus_1",
  type: "deletion",
  status: "pending",
  decided_by: "user_1",
  failure_code: null,
}

describe("reviewRefusal", () => {
  it.each(["approve", "reject"] as const)("lets a pending deletion be %sd", (action) => {
    expect(reviewRefusal({ type: "deletion", status: "pending" }, action)).toBeNull()
  })

  it("lets a failed deletion be approved again, to resume it", () => {
    expect(reviewRefusal({ type: "deletion", status: "failed" }, "approve")).toBeNull()
  })

  it("does not let a failed deletion be rejected, as part of the data may be gone", () => {
    expect(reviewRefusal({ type: "deletion", status: "failed" }, "reject")?.code).toBe(
      "request_already_decided",
    )
  })

  it.each([
    ["completed", "approve"],
    ["completed", "reject"],
    ["rejected", "approve"],
    ["rejected", "reject"],
  ] as const)("refuses a %s deletion on %s", (status, action) => {
    expect(reviewRefusal({ type: "deletion", status }, action)?.code).toBe(
      "request_already_decided",
    )
  })

  it("refuses an export, which needs no decision", () => {
    expect(reviewRefusal({ type: "export", status: "pending" }, "approve")?.code).toBe(
      "request_not_reviewable",
    )
  })
})

describe("views", () => {
  it("keeps the operator out of what the customer sees", () => {
    const view = customerView(row)

    expect(view).not.toHaveProperty("decided_by")
    expect(view).not.toHaveProperty("customer_id")
    expect(view).toMatchObject({ id: "pvreq_1", type: "deletion", status: "pending" })
  })

  it("shows the decision in the back office", () => {
    expect(adminView(row)).toMatchObject({ customer_id: "cus_1", decided_by: "user_1" })
  })
})
