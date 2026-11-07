import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { checkBody, parsePayload, validateBody } from "../validate-payload"

const schema = z.object({
  email: z.email(),
  items: z.array(z.object({ quantity: z.number().int().positive() })),
})

const valid = { email: "cliente@example.com", items: [{ quantity: 1 }] }

function fakeResponse() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
  return res as typeof res & MedusaResponse
}

describe("parsePayload", () => {
  it("returns the parsed data", () => {
    expect(parsePayload(schema, valid)).toEqual({ ok: true, data: valid })
  })

  it("drops unknown fields, as the schema defines", () => {
    expect(parsePayload(schema, { ...valid, is_admin: true })).toEqual({ ok: true, data: valid })
  })

  it("names every invalid field, with nested paths", () => {
    const result = parsePayload(schema, { email: "nope", items: [{ quantity: 0 }] })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe("invalid_payload")
      expect(result.error.message).toMatch(/^email: .+; items\.0\.quantity: .+$/)
    }
  })

  it("does not echo the submitted values", () => {
    const submitted = "fictional submitted value"
    const result = parsePayload(schema, { email: submitted, items: submitted })

    expect(JSON.stringify(result)).not.toContain(submitted)
  })

  it("reports a body that is not an object", () => {
    const result = parsePayload(schema, undefined)

    expect(result).toMatchObject({ ok: false, error: { code: "invalid_payload" } })
  })

  it("accepts schemas from Medusa's own Zod", () => {
    const { z: medusaZod } = jest.requireActual<typeof import("@medusajs/framework/zod")>(
      "@medusajs/framework/zod",
    ) as unknown as { z: typeof z }

    expect(parsePayload(medusaZod.object({ id: medusaZod.string() }), { id: "1" }).ok).toBe(true)
  })
})

describe("validateBody", () => {
  it("stores the parsed body and continues", () => {
    const req = { body: { ...valid, is_admin: true } } as unknown as MedusaRequest
    const res = fakeResponse()
    const next = jest.fn() as unknown as MedusaNextFunction

    validateBody(schema)(req, res, next)

    expect(req.validatedBody).toEqual(valid)
    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it("answers 400 with { code, message } and stops", () => {
    const req = { body: {} } as unknown as MedusaRequest
    const res = fakeResponse()
    const next = jest.fn() as unknown as MedusaNextFunction

    validateBody(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    const body = res.json.mock.calls[0]?.[0] as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(["code", "message"])
    expect(body.code).toBe("invalid_payload")
    expect(next).not.toHaveBeenCalled()
  })
})

describe("checkBody", () => {
  const run = (body: unknown) => {
    const req = { body } as MedusaRequest
    const res = fakeResponse()
    const next = jest.fn() as jest.Mock & MedusaNextFunction
    checkBody(schema, "invalid_example")(req, res, next)
    return { req, res, next }
  }

  it("lets a valid body through without touching the validated body", () => {
    const { req, res, next } = run(valid)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
    expect(req.validatedBody).toBeUndefined()
  })

  it("answers 400 under the given code and stops the request", () => {
    const { res, next } = run({ email: "nope", items: [] })

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      code: "invalid_example",
      message: expect.stringMatching(/^email: /),
    })
  })
})
