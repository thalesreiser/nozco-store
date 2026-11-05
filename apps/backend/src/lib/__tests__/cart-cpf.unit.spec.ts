import { readCpfFromMetadata, saveCartCpf, withoutCpfInMetadata } from "../cart-cpf"

// Fictional, and only assembled at run time.
const cpf = ["123456789", "09"].join("")

function fakeCarts(cart?: { completed_at?: Date; metadata?: Record<string, unknown> }) {
  return {
    listCarts: jest.fn().mockResolvedValue(cart ? [{ id: "cart_1", ...cart }] : []),
    updateCarts: jest.fn().mockResolvedValue({}),
  }
}

type Store = Parameters<typeof saveCartCpf>[0]

describe("saveCartCpf", () => {
  it("adds the CPF and keeps the other metadata", async () => {
    const carts = fakeCarts({ metadata: { gift: true } })

    await expect(saveCartCpf(carts as unknown as Store, "cart_1", cpf)).resolves.toBe("saved")
    expect(carts.updateCarts).toHaveBeenCalledWith("cart_1", { metadata: { gift: true, cpf } })
  })

  it("does not write to a cart that does not exist", async () => {
    const carts = fakeCarts()

    await expect(saveCartCpf(carts as unknown as Store, "nope", cpf)).resolves.toBe(
      "cart_not_found",
    )
    expect(carts.updateCarts).not.toHaveBeenCalled()
  })

  it("does not write to a completed cart", async () => {
    const carts = fakeCarts({ completed_at: new Date(0) })

    await expect(saveCartCpf(carts as unknown as Store, "cart_1", cpf)).resolves.toBe(
      "cart_completed",
    )
    expect(carts.updateCarts).not.toHaveBeenCalled()
  })
})

describe("readCpfFromMetadata", () => {
  it("returns a valid CPF", () => {
    expect(readCpfFromMetadata({ cpf })).toBe(cpf)
  })

  it.each([
    ["no metadata", null],
    ["no key", {}],
    ["an invalid value written through another route", { cpf: "123" }],
    ["a value that is not a string", { cpf: 123 }],
  ])("returns null for %s", (_name, metadata) => {
    expect(readCpfFromMetadata(metadata)).toBeNull()
  })
})

describe("withoutCpfInMetadata", () => {
  it("removes the CPF from cart, order and list responses, keeping the rest", () => {
    const metadata = { cpf, gift: true }
    const date = new Date(0)

    expect(
      withoutCpfInMetadata({
        cart: { id: "cart_1", metadata, created_at: date },
        order: { metadata },
        orders: [{ metadata }, { metadata: null }],
      }),
    ).toEqual({
      cart: { id: "cart_1", metadata: { gift: true }, created_at: date },
      order: { metadata: { gift: true } },
      orders: [{ metadata: { gift: true } }, { metadata: null }],
    })
  })

  it("does not change the object it receives", () => {
    const body = { cart: { metadata: { cpf } } }

    withoutCpfInMetadata(body)

    expect(body.cart.metadata.cpf).toBe(cpf)
  })

  it("leaves a `cpf` outside metadata alone, like the mask the CPF route answers with", () => {
    expect(withoutCpfInMetadata({ cpf: "***" })).toEqual({ cpf: "***" })
  })
})
