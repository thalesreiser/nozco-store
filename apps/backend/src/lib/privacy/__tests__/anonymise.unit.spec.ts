import {
  ANONYMISED_CART,
  ANONYMISED_CART_ADDRESS,
  ANONYMISED_CUSTOMER,
  anonymiseCustomer,
  cartAddressIds,
} from "../anonymise"
import type { CartStore, CustomerStore } from "../stores"

function setup(options: { customerExists?: boolean } = {}) {
  const calls: string[] = []
  const track =
    <T>(name: string, value?: T) =>
    () => {
      calls.push(name)
      return Promise.resolve(value)
    }
  const carts = {
    listCarts: jest.fn(
      track("listCarts", [
        { id: "cart_1", shipping_address: { id: "addr_1" }, billing_address: { id: "addr_1" } },
        { id: "cart_2", shipping_address: null, billing_address: { id: "addr_2" } },
      ]),
    ),
    updateAddresses: jest.fn(track("updateAddresses")),
    updateCarts: jest.fn(track("updateCarts")),
  }
  const customers = {
    listCustomers: jest.fn(
      track(
        "listCustomers",
        options.customerExists === false
          ? []
          : [{ id: "cus_1", addresses: [{ id: "cuaddr_1" }, { id: "cuaddr_2" }] }],
      ),
    ),
    deleteCustomerAddresses: jest.fn(track("deleteCustomerAddresses")),
    updateCustomers: jest.fn(track("updateCustomers")),
  }
  const removeAccount = jest.fn(track<void>("removeAccount"))
  const stores = {
    carts: carts as unknown as CartStore,
    customers: customers as unknown as CustomerStore,
    removeAccount,
  }
  return { calls, carts, customers, removeAccount, stores }
}

describe("anonymiseCustomer", () => {
  it("blanks each cart address once and every cart of the customer", async () => {
    const { carts, stores } = setup()

    await anonymiseCustomer(stores, "cus_1")

    expect(carts.listCarts).toHaveBeenCalledWith({ customer_id: "cus_1" }, expect.anything())
    expect(carts.updateAddresses).toHaveBeenCalledWith([
      { id: "addr_1", ...ANONYMISED_CART_ADDRESS },
      { id: "addr_2", ...ANONYMISED_CART_ADDRESS },
    ])
    expect(carts.updateCarts).toHaveBeenCalledWith([
      { id: "cart_1", ...ANONYMISED_CART },
      { id: "cart_2", ...ANONYMISED_CART },
    ])
  })

  it("deletes the addresses and blanks the customer", async () => {
    const { customers, stores } = setup()

    await anonymiseCustomer(stores, "cus_1")

    expect(customers.deleteCustomerAddresses).toHaveBeenCalledWith(["cuaddr_1", "cuaddr_2"])
    expect(customers.updateCustomers).toHaveBeenCalledWith("cus_1", ANONYMISED_CUSTOMER)
  })

  it("removes the account last, because that makes the customer unfindable", async () => {
    const { calls, removeAccount, stores } = setup()

    await anonymiseCustomer(stores, "cus_1")

    expect(removeAccount).toHaveBeenCalledWith("cus_1")
    expect(calls.at(-1)).toBe("removeAccount")
  })

  it("still cleans the carts on a retry after the customer is gone", async () => {
    const { carts, customers, removeAccount, stores } = setup({ customerExists: false })

    await anonymiseCustomer(stores, "cus_1")

    expect(carts.updateCarts).toHaveBeenCalled()
    expect(customers.updateCustomers).not.toHaveBeenCalled()
    expect(removeAccount).not.toHaveBeenCalled()
  })

  it("does not remove the account when an earlier step fails", async () => {
    const { carts, removeAccount, stores } = setup()
    carts.updateCarts.mockRejectedValueOnce(new Error("database down"))

    await expect(anonymiseCustomer(stores, "cus_1")).rejects.toThrow("database down")

    expect(removeAccount).not.toHaveBeenCalled()
  })

  it("names every personal field of the customer", () => {
    expect(Object.keys(ANONYMISED_CUSTOMER).sort()).toEqual([
      "company_name",
      "email",
      "first_name",
      "last_name",
      "metadata",
      "phone",
    ])
  })
})

describe("cartAddressIds", () => {
  it("drops empty and repeated ids", () => {
    expect(
      cartAddressIds([
        { shipping_address: { id: "a" }, billing_address: { id: "a" } },
        { shipping_address: null, billing_address: undefined },
        { shipping_address: { id: "b" }, billing_address: { id: "a" } },
      ]),
    ).toEqual(["a", "b"])
  })
})
