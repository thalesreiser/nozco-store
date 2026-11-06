import { logger as reporter } from "@medusajs/framework/logger"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { readCpfFromMetadata } from "../../src/lib/cart-cpf"

jest.setTimeout(120 * 1000)

// Fictional, and only assembled at run time.
const base = "123456789"
const check = "09"
const validCpf = `${base}${check}`
const validMasked = `${base.slice(0, 3)}.${base.slice(3, 6)}.${base.slice(6)}-${check}`
const invalidCpf = `${base}01`

interface Answer {
  status: number
  data: Record<string, unknown>
}

const levels = ["info", "warn", "error", "debug", "http", "log", "verbose", "silly"] as const

/** JSON.stringify drops an error's message and stack, which are what must be checked. */
function errorFields(_key: string, value: unknown): unknown {
  return value instanceof Error
    ? { ...value, message: value.message, stack: value.stack, cause: value.cause }
    : value
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("POST /store/carts/:id/cpf", () => {
      let cartId: string
      let headers: Record<string, string>
      const spies: jest.SpyInstance[] = []

      // A string body goes out as it is, so that a test can send malformed JSON.
      const sendRaw = (id: string, body: string) =>
        api.post(`/store/carts/${id}/cpf`, body, {
          headers: { ...headers, "content-type": "application/json" },
          validateStatus: () => true,
          transformRequest: [(data: unknown) => data],
        }) as Promise<Answer>
      const send = (id: string, value: unknown) => sendRaw(id, JSON.stringify(value))

      const storedMetadata = async () => {
        const cart = await getContainer()
          .resolve(Modules.CART)
          .retrieveCart(cartId, { select: ["metadata"] })
        return cart.metadata
      }
      const logged = () =>
        JSON.stringify(
          spies.flatMap((spy) => spy.mock.calls),
          errorFields,
        )

      beforeEach(async () => {
        const container = getContainer()
        const key = await container.resolve(Modules.API_KEY).createApiKeys({
          title: "Integration test",
          type: "publishable",
          created_by: "integration-test",
        })
        headers = { "x-publishable-api-key": key.token }
        const cart = await container.resolve(Modules.CART).createCarts({
          currency_code: "brl",
          email: "cliente@example.com",
          metadata: { gift: true },
        })
        cartId = cart.id
        spies.length = 0
        spies.push(...levels.map((level) => jest.spyOn(reporter, level)))
      })

      afterEach(() => {
        spies.forEach((spy) => spy.mockRestore())
      })

      it("stores a valid masked CPF as digits and answers with the mask only", async () => {
        const answer = await send(cartId, { cpf: validMasked })

        expect(answer.status).toBe(200)
        expect(answer.data).toEqual({ cpf: `***.***.***-${check}` })
        const metadata = await storedMetadata()
        expect(metadata).toEqual({ gift: true, cpf: validCpf })
        expect(readCpfFromMetadata(metadata)).toBe(validCpf)
      })

      it.each([
        ["wrong check digits", { cpf: invalidCpf }],
        ["repeated digits", { cpf: "1".repeat(11) }],
        ["a number", { cpf: 123 }],
        ["no CPF", {}],
      ])("rejects %s and stores nothing", async (_name, body) => {
        const answer = await send(cartId, body)

        expect(answer.status).toBe(400)
        expect(answer.data.code).toBe("invalid_payload")
        expect(answer.data.message).toContain("cpf: ")
        expect(answer.data.message).not.toContain(base)
        expect(await storedMetadata()).toEqual({ gift: true })
      })

      it("answers 404 for a cart that does not exist", async () => {
        const answer = await send("cart_missing", { cpf: validCpf })

        expect(answer.status).toBe(404)
        expect(answer.data.code).toBe("cart_not_found")
      })

      it("answers 409 for a completed cart", async () => {
        await getContainer().resolve(Modules.CART).updateCarts(cartId, { completed_at: new Date() })

        const answer = await send(cartId, { cpf: validCpf })

        expect(answer.status).toBe(409)
        expect(answer.data.code).toBe("cart_completed")
      })

      it("needs a publishable key, as every store route does", async () => {
        const answer = (await api.post(
          `/store/carts/${cartId}/cpf`,
          { cpf: validCpf },
          { validateStatus: () => true },
        )) as Answer

        expect(answer.status).toBe(400)
        expect(await storedMetadata()).toEqual({ gift: true })
      })

      it("keeps the CPF out of Medusa's cart route", async () => {
        await send(cartId, { cpf: validCpf })

        const answer = (await api.get(`/store/carts/${cartId}`, { headers })) as Answer

        expect(JSON.stringify(answer.data)).not.toContain(validCpf)
        expect((answer.data.cart as { metadata: unknown }).metadata).toEqual({ gift: true })
      })

      it("keeps the CPF out of Medusa's order route, which needs only the order ID", async () => {
        const order = await getContainer()
          .resolve(Modules.ORDER)
          .createOrders({
            currency_code: "brl",
            email: "cliente@example.com",
            metadata: { gift: true, cpf: validCpf },
            items: [],
          })

        const plain = (await api.get(`/store/orders/${order.id}`, { headers })) as Answer
        const asked = (await api.get(`/store/orders/${order.id}?fields=%2Bmetadata`, {
          headers,
          validateStatus: () => true,
        })) as Answer

        expect(plain.status).toBe(200)
        expect(JSON.stringify(plain.data)).not.toContain(validCpf)
        expect(JSON.stringify(asked.data)).not.toContain(validCpf)
      })

      it("logs through the redacting logger", () => {
        const logger = getContainer().resolve(ContainerRegistrationKeys.LOGGER)
        logger.info(`direct ${validCpf}`)

        expect(logged()).toContain("direct [redacted-cpf]")
        expect(logged()).not.toContain(validCpf)
      })

      it("keeps the CPF out of the logs when the request succeeds or is rejected", async () => {
        await send(cartId, { cpf: validMasked })
        await send(cartId, { cpf: invalidCpf })

        for (const cpf of [validCpf, validMasked, invalidCpf]) {
          expect(logged()).not.toContain(cpf)
        }
      })

      // The one path found where Medusa logs request content: on a malformed body it logs
      // body-parser's message, and JSON.parse quotes the body in it, sometimes cut after the ninth
      // digit. The check digits follow from the first nine, so those must not appear either.
      it.each([
        ["whole", `{"cpf":x${validCpf}}`],
        ["cut", `{"cpf":'${validCpf}'}`],
      ])(
        "keeps the CPF out of the logs when a malformed body is quoted %s",
        async (_name, body) => {
          const answer = await sendRaw(cartId, body)

          expect(answer.status).toBe(400)
          expect(logged()).toContain("Error 400 at")
          expect(logged()).toContain("[redacted-body]")
          expect(logged()).not.toContain(base)
        },
      )
    })
  },
})
