import { logger as reporter } from "@medusajs/framework/logger"
import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import type { CustomerExport } from "../../src/lib/privacy/export"
import { PRIVACY_REQUEST_MODULE } from "../../src/modules/privacy-request"
import type PrivacyRequestModuleService from "../../src/modules/privacy-request/service"

jest.setTimeout(180 * 1000)

// Fictional, and only assembled at run time.
const cpf = `${"123456789"}${"09"}`
const password = "fictional-password"
const ROUTE = "/store/customers/me/privacy-requests"

const orderAddress = {
  first_name: "Ana",
  last_name: "Teste",
  address_1: "Rua Exemplo, 1",
  city: "Cidade Exemplo",
  province: "RJ",
  postal_code: "00000-000",
  country_code: "br",
}

type Headers = Record<string, string>
/** The union of what the routes under test answer; each test reads the part it expects. */
interface Body {
  code: string
  token: string
  customer: { id: string }
  request: { id: string; status: string }
  requests: { id: string; type: string }[]
  export: CustomerExport
}
interface Answer {
  status: number
  data: Body
  headers: Record<string, string>
}
interface Api {
  get(url: string, config: { headers?: Headers; validateStatus: () => boolean }): Promise<Answer>
  post(
    url: string,
    body: unknown,
    config: { headers?: Headers; validateStatus: () => boolean },
  ): Promise<Answer>
}

const validateStatus = () => true

medusaIntegrationTestRunner({
  env: { RATE_LIMIT_SENSITIVE_MAX_PER_ACCOUNT: "4" },
  testSuite: ({ api: untypedApi, getContainer }) => {
    const api = untypedApi as Api
    let publishable: Headers
    let operator: Headers
    let sequence = 0

    /** Goes through Medusa's own routes, so the login and the auth identity are real. */
    const registerCustomer = async (name: string) => {
      const email = `${name}-${Date.now()}-${(sequence += 1)}@example.com`
      const credentials = { email, password }
      const registered = await api.post("/auth/customer/emailpass/register", credentials, {
        validateStatus,
      })
      const created = await api.post(
        "/store/customers",
        { email, first_name: name, last_name: "Teste", phone: "+5500000000000" },
        {
          headers: { ...publishable, authorization: `Bearer ${registered.data.token}` },
          validateStatus,
        },
      )
      expect(created.status).toBe(200)
      const login = await api.post("/auth/customer/emailpass", credentials, { validateStatus })
      expect(login.status).toBe(200)
      return {
        id: created.data.customer.id,
        email,
        headers: { ...publishable, authorization: `Bearer ${login.data.token}` },
      }
    }

    const addCustomerData = async (customer: { id: string; email: string }) => {
      const container = getContainer()
      await container.resolve(Modules.CUSTOMER).createCustomerAddresses({
        customer_id: customer.id,
        address_1: "Rua Cadastro, 2",
        city: "Cidade Exemplo",
        country_code: "br",
      })
      const cart = await container.resolve(Modules.CART).createCarts({
        currency_code: "brl",
        customer_id: customer.id,
        email: customer.email,
        metadata: { cpf, gift: true },
        shipping_address: orderAddress,
      })
      const order = await container.resolve(Modules.ORDER).createOrders({
        currency_code: "brl",
        customer_id: customer.id,
        email: customer.email,
        metadata: { cpf },
        shipping_address: orderAddress,
        billing_address: orderAddress,
        items: [{ title: "Camiseta Teste", quantity: 2, unit_price: 129 }],
      })
      return { cartId: cart.id, orderId: order.id }
    }

    const request = (headers: Headers, type: string) =>
      api.post(ROUTE, { type }, { headers, validateStatus })
    const decide = (id: string, decision: string, headers: Headers = operator) =>
      api.post(`/admin/privacy-requests/${id}/${decision}`, {}, { headers, validateStatus })
    const reject = (id: string, body: unknown, headers: Headers = operator) =>
      api.post(`/admin/privacy-requests/${id}/reject`, body, { headers, validateStatus })
    const storedOrder = (id: string) =>
      getContainer()
        .resolve(Modules.ORDER)
        .retrieveOrder(id, {
          select: ["id", "email", "customer_id", "metadata", "total"],
          relations: ["items", "shipping_address", "billing_address"],
        })
    const requestLog = () =>
      getContainer().resolve<PrivacyRequestModuleService>(PRIVACY_REQUEST_MODULE)

    beforeEach(async () => {
      const keys = getContainer().resolve(Modules.API_KEY)
      const key = await keys.createApiKeys({
        title: "Integration test",
        type: "publishable",
        created_by: "integration-test",
      })
      publishable = { "x-publishable-api-key": key.token }
      const secret = await keys.createApiKeys({
        title: "Integration test operator",
        type: "secret",
        created_by: "integration-test",
      })
      operator = { authorization: `Basic ${Buffer.from(`${secret.token}:`).toString("base64")}` }
    })

    describe("who may ask", () => {
      it("refuses a request without a session", async () => {
        const answer = await request(publishable, "export")

        expect(answer.status).toBe(401)
      })

      it("refuses a token that belongs to no customer yet", async () => {
        const registered = await api.post(
          "/auth/customer/emailpass/register",
          { email: `no-customer-${Date.now()}@example.com`, password },
          { validateStatus },
        )

        const answer = await request(
          { ...publishable, authorization: `Bearer ${registered.data.token}` },
          "export",
        )

        expect(answer.status).toBe(401)
      })

      it("refuses a body that names another customer", async () => {
        const ana = await registerCustomer("ana")
        const bia = await registerCustomer("bia")

        const answer = await api.post(
          ROUTE,
          { type: "export", customer_id: ana.id },
          { headers: bia.headers, validateStatus },
        )

        expect(answer.status).toBe(400)
        expect(answer.data.code).toBe("invalid_payload")
      })

      it("gives another customer nothing of this customer's", async () => {
        const ana = await registerCustomer("ana")
        const bia = await registerCustomer("bia")
        const { cartId, orderId } = await addCustomerData(ana)
        await request(ana.headers, "deletion")

        const exported = await request(bia.headers, "export")
        const listed = await api.get(ROUTE, { headers: bia.headers, validateStatus })

        expect(exported.data.export.customer.id).toBe(bia.id)
        expect(exported.data.export.carts).toEqual([])
        expect(exported.data.export.orders).toEqual([])
        const everything = JSON.stringify([exported.data, listed.data])
        for (const value of [ana.id, ana.email, cartId, orderId, cpf]) {
          expect(everything).not.toContain(value)
        }
        expect(listed.data.requests.map((row) => row.type)).toEqual(["export"])
      })

      it("does not let a customer use the operator's routes", async () => {
        const ana = await registerCustomer("ana")
        const { data } = await request(ana.headers, "deletion")

        const list = await api.get("/admin/privacy-requests", {
          headers: ana.headers,
          validateStatus,
        })
        const approve = await decide(data.request.id, "approve", ana.headers)

        expect(list.status).toBe(401)
        expect(approve.status).toBe(401)
        const customers = getContainer().resolve(Modules.CUSTOMER)
        expect((await customers.retrieveCustomer(ana.id)).email).toBe(ana.email)
      })

      it("refuses the operator's routes without a session", async () => {
        const list = await api.get("/admin/privacy-requests", { validateStatus })
        const approve = await api.post(
          "/admin/privacy-requests/pvreq_missing/approve",
          {},
          { validateStatus },
        )

        expect(list.status).toBe(401)
        expect(approve.status).toBe(401)
      })

      it("limits new requests per customer, whatever the body says", async () => {
        const ana = await registerCustomer("ana")
        const bia = await registerCustomer("bia")
        for (let index = 0; index < 4; index++) {
          expect((await request(ana.headers, "export")).status).toBe(200)
        }

        const refused = await request(ana.headers, "export")

        expect(refused.status).toBe(429)
        expect(refused.data.code).toBe("rate_limited")
        expect(Number(refused.headers["retry-after"])).toBeGreaterThan(0)
        expect((await request(bia.headers, "export")).status).toBe(200)
      })
    })

    describe("export", () => {
      it("holds the customer, addresses, carts, orders and CPF, and is not cached", async () => {
        const ana = await registerCustomer("ana")
        const { cartId, orderId } = await addCustomerData(ana)

        const answer = await request(ana.headers, "export")

        expect(answer.status).toBe(200)
        expect(answer.headers["cache-control"]).toBe("no-store")
        expect(answer.data.request).toMatchObject({ type: "export", status: "completed" })
        const { customer, addresses, carts, orders } = answer.data.export
        expect(customer).toMatchObject({ id: ana.id, email: ana.email, first_name: "ana" })
        expect(addresses).toEqual([expect.objectContaining({ address_1: "Rua Cadastro, 2" })])
        expect(carts).toEqual([
          expect.objectContaining({
            id: cartId,
            cpf,
            shipping_address: expect.objectContaining({ address_1: orderAddress.address_1 }),
          }),
        ])
        expect(orders).toEqual([
          expect.objectContaining({
            id: orderId,
            cpf,
            email: ana.email,
            shipping_address: expect.objectContaining({ postal_code: orderAddress.postal_code }),
          }),
        ])
        expect(Number(orders[0]?.total)).toBe(258)
        expect(orders[0]?.items[0]).toMatchObject({ title: "Camiseta Teste" })
        expect(Number(orders[0]?.items[0]?.quantity)).toBe(2)
      })

      it("leaves out a guest order with the same e-mail, whose owner is unproven", async () => {
        const ana = await registerCustomer("ana")
        const guest = await getContainer()
          .resolve(Modules.ORDER)
          .createOrders({ currency_code: "brl", email: ana.email, items: [] })

        const answer = await request(ana.headers, "export")

        expect(JSON.stringify(answer.data)).not.toContain(guest.id)
      })

      it("gathers more carts than one default page", async () => {
        const ana = await registerCustomer("ana")
        await getContainer()
          .resolve(Modules.CART)
          .createCarts(
            Array.from({ length: 20 }, () => ({ currency_code: "brl", customer_id: ana.id })),
          )

        const answer = await request(ana.headers, "export")

        expect(answer.data.export.carts).toHaveLength(20)
      })

      it("logs who, what and the result, and keeps the CPF out of the log and the logs", async () => {
        const ana = await registerCustomer("ana")
        await addCustomerData(ana)
        const levels = [
          "info",
          "warn",
          "error",
          "debug",
          "http",
          "log",
          "verbose",
          "silly",
        ] as const
        const spies = levels.map((level) => jest.spyOn(reporter, level))

        const answer = await request(ana.headers, "export")

        const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls))
        spies.forEach((spy) => spy.mockRestore())
        expect(logged).not.toContain(cpf)
        const rows = await requestLog().listPrivacyRequests({ customer_id: ana.id })
        expect(rows).toEqual([
          expect.objectContaining({
            id: answer.data.request.id,
            customer_id: ana.id,
            type: "export",
            status: "completed",
            created_at: expect.anything(),
          }),
        ])
        expect(JSON.stringify(rows)).not.toContain(cpf)
      })
    })

    describe("deletion", () => {
      it("changes nothing until an operator approves, and asking twice is one request", async () => {
        const ana = await registerCustomer("ana")
        const { cartId } = await addCustomerData(ana)

        const first = await request(ana.headers, "deletion")
        const second = await request(ana.headers, "deletion")

        expect(first.status).toBe(202)
        expect(first.data.request.status).toBe("pending")
        expect(second.status).toBe(200)
        expect(second.data.request.id).toBe(first.data.request.id)
        const container = getContainer()
        const customer = await container.resolve(Modules.CUSTOMER).retrieveCustomer(ana.id)
        expect(customer.email).toBe(ana.email)
        const cart = await container
          .resolve(Modules.CART)
          .retrieveCart(cartId, { select: ["metadata"] })
        expect(cart.metadata).toEqual({ cpf, gift: true })
      })

      it("anonymises the customer and carts and keeps the order on approval", async () => {
        const ana = await registerCustomer("ana")
        const { cartId, orderId } = await addCustomerData(ana)
        const carts = getContainer().resolve(Modules.CART)
        const completed = await carts.createCarts({
          currency_code: "brl",
          customer_id: ana.id,
          email: ana.email,
          metadata: { cpf: "typed-wrong" },
        })
        await carts.updateCarts(completed.id, { completed_at: new Date() })
        const orderBefore = await storedOrder(orderId)
        const { data } = await request(ana.headers, "deletion")

        const answer = await decide(data.request.id, "approve")

        expect(answer.status).toBe(200)
        expect(answer.data.request).toMatchObject({
          status: "completed",
          customer_id: ana.id,
          decided_by: expect.any(String),
          failure_code: null,
        })

        const customers = getContainer().resolve(Modules.CUSTOMER)
        expect(await customers.listCustomers({ id: ana.id })).toEqual([])
        const [deleted] = await customers.listCustomers(
          { id: ana.id },
          { withDeleted: true, relations: ["addresses"] },
        )
        expect(deleted).toMatchObject({
          email: null,
          first_name: null,
          last_name: null,
          phone: null,
          metadata: null,
          addresses: [],
        })

        const [cart, completedCart] = await Promise.all(
          [cartId, completed.id].map((id) =>
            carts.retrieveCart(id, { relations: ["shipping_address"] }),
          ),
        )
        expect(cart).toMatchObject({ email: null, metadata: null })
        expect(cart?.shipping_address).toMatchObject({ first_name: null, address_1: null })
        expect(completedCart).toMatchObject({ email: null, metadata: null })

        // The whole fiscal record is still there, CPF included.
        const orderAfter = await storedOrder(orderId)
        expect(JSON.parse(JSON.stringify(orderAfter))).toEqual(
          JSON.parse(JSON.stringify(orderBefore)),
        )
        expect(orderAfter.metadata).toEqual({ cpf })
        expect(orderAfter.shipping_address).toMatchObject({ address_1: orderAddress.address_1 })

        const [logRow] = await requestLog().listPrivacyRequests({ id: data.request.id })
        expect(JSON.stringify(logRow)).not.toContain(cpf)
        expect(JSON.stringify(logRow)).not.toContain(ana.email)
      })

      it("ends the login, and the same e-mail can register again", async () => {
        const ana = await registerCustomer("ana")
        const { data } = await request(ana.headers, "deletion")

        await decide(data.request.id, "approve")

        const credentials = { email: ana.email, password }
        const login = await api.post("/auth/customer/emailpass", credentials, { validateStatus })
        expect(login.status).toBe(401)
        const again = await api.post("/auth/customer/emailpass/register", credentials, {
          validateStatus,
        })
        expect(again.status).toBe(200)
      })

      it("answers 404 to a token issued before the anonymisation", async () => {
        const ana = await registerCustomer("ana")
        const { data } = await request(ana.headers, "deletion")
        await decide(data.request.id, "approve")

        const answer = await request(ana.headers, "export")

        expect(answer.status).toBe(404)
        expect(answer.data.code).toBe("customer_not_found")
      })

      it("keeps the data on rejection and accepts no second decision", async () => {
        const ana = await registerCustomer("ana")
        const { data } = await request(ana.headers, "deletion")

        const rejected = await reject(data.request.id, { reason: "Motivo de exemplo" })
        const late = await decide(data.request.id, "approve")

        expect(rejected.data.request.status).toBe("rejected")
        expect(late.status).toBe(409)
        expect(late.data.code).toBe("request_already_decided")
        const customers = getContainer().resolve(Modules.CUSTOMER)
        expect((await customers.retrieveCustomer(ana.id)).email).toBe(ana.email)
      })

      it("needs a reason to reject, and leaves the request pending without one", async () => {
        const ana = await registerCustomer("ana")
        const { data } = await request(ana.headers, "deletion")

        const answers = await Promise.all(
          [{}, { reason: "   " }, { reason: "a".repeat(501) }, { reason: "Motivo", x: 1 }].map(
            (body) => reject(data.request.id, body),
          ),
        )

        for (const answer of answers) {
          expect(answer.status).toBe(400)
          expect(answer.data.code).toBe("invalid_payload")
        }
        const [row] = await requestLog().listPrivacyRequests({ id: data.request.id })
        expect(row).toMatchObject({ status: "pending", rejection_reason: null })
        expect((await reject(data.request.id, {}, ana.headers)).status).toBe(401)
      })

      it("shows the reason to the customer and never logs it", async () => {
        const ana = await registerCustomer("ana")
        const bia = await registerCustomer("bia")
        const { data } = await request(ana.headers, "deletion")
        const reason = "Motivo-de-exemplo-que-nao-vai-para-os-logs"
        const levels = [
          "info",
          "warn",
          "error",
          "debug",
          "http",
          "log",
          "verbose",
          "silly",
        ] as const
        const spies = [
          ...levels.map((level) => jest.spyOn(reporter, level)),
          jest.spyOn(process.stdout, "write"),
          jest.spyOn(process.stderr, "write"),
        ]

        const badLength = await reject(data.request.id, { reason: reason.repeat(20) })
        const malformed = await api.post(
          `/admin/privacy-requests/${data.request.id}/reject`,
          `{"reason":"${reason}`,
          { headers: { ...operator, "content-type": "application/json" }, validateStatus },
        )
        const rejected = await reject(data.request.id, { reason })
        const again = await reject(data.request.id, { reason: `${reason}-de-novo` })
        const list = await api.get(ROUTE, { headers: ana.headers, validateStatus })
        const others = await api.get(ROUTE, { headers: bia.headers, validateStatus })

        const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls))
        spies.forEach((spy) => spy.mockRestore())
        expect(logged).not.toContain(reason)
        expect(badLength.status).toBe(400)
        expect(JSON.stringify(badLength.data)).not.toContain(reason)
        expect(malformed.status).toBe(400)
        expect(rejected.status).toBe(200)
        expect(rejected.data.request).toMatchObject({
          status: "rejected",
          rejection_reason: reason,
        })
        expect(again.status).toBe(409)
        expect(list.status).toBe(200)
        expect(list.data.requests).toEqual([
          expect.objectContaining({
            id: data.request.id,
            status: "rejected",
            rejection_reason: reason,
          }),
        ])
        expect(list.data.requests[0]).not.toHaveProperty("decided_by")
        expect(JSON.stringify(others.data)).not.toContain(reason)
      })

      it("refuses to approve an export or a request that does not exist", async () => {
        const ana = await registerCustomer("ana")
        const { data } = await request(ana.headers, "export")

        expect((await decide(data.request.id, "approve")).data.code).toBe("request_not_reviewable")
        expect((await decide("pvreq_missing", "approve")).status).toBe(404)
      })
    })

    describe("the operator's list", () => {
      it("filters by status and type and pages, with ids and no personal data", async () => {
        const ana = await registerCustomer("ana")
        const bia = await registerCustomer("bia")
        await request(ana.headers, "export")
        const { data } = await request(bia.headers, "deletion")

        const answer = await api.get("/admin/privacy-requests?status=pending&type=deletion", {
          headers: operator,
          validateStatus,
        })

        expect(answer.status).toBe(200)
        expect(answer.data).toMatchObject({ count: 1, limit: 20, offset: 0 })
        expect(answer.data.requests).toEqual([
          expect.objectContaining({ id: data.request.id, customer_id: bia.id }),
        ])
        expect(JSON.stringify(answer.data)).not.toContain(bia.email)
      })

      it("refuses an invalid filter with { code, message }", async () => {
        const answer = await api.get("/admin/privacy-requests?status=done", {
          headers: operator,
          validateStatus,
        })

        expect(answer.status).toBe(400)
        expect(answer.data.code).toBe("invalid_payload")
      })
    })
  },
})
