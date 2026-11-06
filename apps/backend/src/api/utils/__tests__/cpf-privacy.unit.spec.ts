import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REDACTED_CPF } from "../../../lib/log-redaction"
import { hideCpfInResponses, redactCpfInRequestLine } from "../cpf-privacy"

// Fictional, and only assembled at run time.
const cpf = ["123456789", "09"].join("")

describe("hideCpfInResponses", () => {
  it("removes the CPF from what the route sends", () => {
    const send = jest.fn()
    const res = { json: send } as unknown as MedusaResponse
    const next = jest.fn()

    hideCpfInResponses({} as MedusaRequest, res, next)
    res.json({ cart: { metadata: { cpf, gift: true } } })

    expect(next).toHaveBeenCalled()
    expect(send).toHaveBeenCalledWith({ cart: { metadata: { gift: true } } })
  })
})

describe("redactCpfInRequestLine", () => {
  it("redacts the URL and referrer the access log reads, not the routing URL", () => {
    const url = `/store/x?cpf=${cpf}`
    const req = {
      url,
      originalUrl: url,
      headers: { referer: `https://store.example/?cpf=${cpf}` },
    } as unknown as MedusaRequest
    const next = jest.fn()

    redactCpfInRequestLine(req, {} as MedusaResponse, next)

    expect(req.originalUrl).toBe(`/store/x?cpf=${REDACTED_CPF}`)
    expect(req.headers.referer).toBe(`https://store.example/?cpf=${REDACTED_CPF}`)
    expect(req.url).toBe(url)
    expect(next).toHaveBeenCalled()
  })

  it("works without a referrer", () => {
    const req = { originalUrl: "/store/x", headers: {} } as unknown as MedusaRequest

    redactCpfInRequestLine(req, {} as MedusaResponse, jest.fn())

    expect(req.originalUrl).toBe("/store/x")
    expect(req.headers.referer).toBeUndefined()
  })
})
