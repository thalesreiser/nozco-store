import { toCartApiError } from "../cart-errors"

describe("toCartApiError", () => {
  it("answers a stock failure with the code the storefront expects, without Medusa's type", () => {
    expect(
      toCartApiError({
        statusCode: 400,
        body: { code: "insufficient_inventory", message: "Some variant does not have it" },
      }),
    ).toEqual({
      status: 409,
      error: { code: "insufficient_stock", message: "The requested quantity is not in stock." },
    })
  })

  it.each([
    ["Cart id not found: cart_1", 404, 404, "cart_not_found"],
    ["Cart cart_1 is already completed.", 400, 409, "cart_completed"],
    ["Variants variant_1 do not exist or belong to a product", 400, 404, "not_found"],
  ])("recognises %s", (message, statusCode, status, code) => {
    const answer = toCartApiError({ statusCode, body: { message } })

    expect(answer?.status).toBe(status)
    expect(answer?.error.code).toBe(code)
    expect(answer?.error.message).not.toContain("_1")
  })

  it.each([
    [400, "invalid_request"],
    [401, "unauthorized"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "conflict"],
    [422, "invalid_request"],
    [418, "invalid_request"],
  ])("gives any other %i a code, keeping its status and message", (statusCode, code) => {
    expect(toCartApiError({ statusCode, body: { message: "Detalhe" } })).toEqual({
      status: statusCode,
      error: { code, message: "Detalhe" },
    })
  })

  it("always has a message", () => {
    expect(toCartApiError({ statusCode: 400, body: {} })?.error.message).toEqual(expect.any(String))
  })

  it.each([500, 503])("leaves a %i to Medusa", (statusCode) => {
    expect(toCartApiError({ statusCode, body: { message: "Interno" } })).toBeNull()
  })
})
