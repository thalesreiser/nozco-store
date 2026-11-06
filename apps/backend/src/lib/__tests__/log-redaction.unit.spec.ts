import type { Logger } from "@medusajs/framework/types"
import { REDACTED_CPF, redactCpfInText, redactingLogger, redactLogValue } from "../log-redaction"

// Fictional, and only assembled at run time.
const base = "123456789"
const check = "09"
const unmasked = `${base}${check}`
const masked = `${base.slice(0, 3)}.${base.slice(3, 6)}.${base.slice(6)}-${check}`

describe("redactCpfInText", () => {
  it.each([
    ["unmasked", unmasked],
    ["masked", masked],
    ["spaced", `${base.slice(0, 3)} ${base.slice(3, 6)} ${base.slice(6)} ${check}`],
    ["with a slash", `${base}/${check}`],
    ["with wrong check digits", `${base}01`],
  ])("replaces a CPF that is %s", (_name, cpf) => {
    expect(redactCpfInText(`before ${cpf} after`)).toBe(`before ${REDACTED_CPF} after`)
  })

  // Node.js 24 quotes a short body whole and cuts a longer one around the error, even after the ninth
  // digit. The first assertion shows that the redaction has something to do.
  it.each([
    ["whole", `{"cpf":x${unmasked}}`],
    ["cut after the ninth digit", `{"cpf":'${unmasked}'}`],
    [
      "on several lines",
      `{
  "cpf": x${unmasked}
}`,
    ],
    ["cut, with text before it", `{"name":"Fulano de Tal","cpf":'${unmasked}'}`],
  ])("removes a malformed body that JSON.parse quotes %s", (_name, body) => {
    let message = ""
    try {
      JSON.parse(body)
    } catch (error) {
      message = (error as Error).message
    }

    expect(message).toContain(base)
    expect(redactCpfInText(message)).not.toContain(base)
    expect(redactCpfInText(message)).toContain("is not valid JSON")
  })

  it("keeps a JSON.parse message that quotes nothing", () => {
    const message = "Expected double-quoted property name in JSON at position 21"

    expect(redactCpfInText(message)).toBe(message)
  })

  it.each([
    ["a timestamp", "1793923200000"],
    ["an IP address", "192.168.100.20"],
    ["a short number", "1234567890"],
    ["a CEP", "01310-100"],
  ])("leaves %s alone", (_name, text) => {
    expect(redactCpfInText(text)).toBe(text)
  })
})

describe("redactLogValue", () => {
  it("redacts nested objects and arrays", () => {
    expect(redactLogValue({ a: [{ cpf: masked }], ok: 1 })).toEqual({
      a: [{ cpf: REDACTED_CPF }],
      ok: 1,
    })
  })

  it("redacts an error and its stack, cause and own fields, leaving the original alone", () => {
    const error = Object.assign(new TypeError(`bad ${unmasked}`, { cause: new Error(masked) }), {
      body: `{"cpf":"${unmasked}"}`,
    })

    const copy = redactLogValue(error) as Error & { body: string }

    expect(copy).toBeInstanceOf(Error)
    expect(copy.name).toBe("TypeError")
    expect(copy.message).toBe(`bad ${REDACTED_CPF}`)
    expect(copy.stack).not.toContain(unmasked)
    expect((copy.cause as Error).message).toBe(REDACTED_CPF)
    expect(copy.body).not.toContain(unmasked)
    expect(error.message).toContain(unmasked)
  })

  it("survives a circular value", () => {
    const value: Record<string, unknown> = { cpf: unmasked }
    value.self = value

    expect(redactLogValue(value)).toEqual({ cpf: REDACTED_CPF, self: "[circular]" })
  })

  it("keeps other values as they are", () => {
    const date = new Date(0)

    expect(redactLogValue(date)).toBe(date)
    expect(redactLogValue(null)).toBeNull()
    expect(redactLogValue(7)).toBe(7)
  })
})

describe("redactingLogger", () => {
  function fakeLogger() {
    return {
      level: "info",
      info: jest.fn(),
      error: jest.fn(),
      shouldLog: jest.fn(() => true),
    }
  }

  it("redacts every argument and returns the logger's own result", () => {
    const inner = fakeLogger()
    const logger = redactingLogger(inner as unknown as Logger)

    logger.info(`saved ${unmasked}`)
    logger.error(`failed ${masked}`, new Error(unmasked))

    expect(inner.info).toHaveBeenCalledWith(`saved ${REDACTED_CPF}`)
    expect(inner.error).toHaveBeenCalledWith(
      `failed ${REDACTED_CPF}`,
      expect.objectContaining({ message: REDACTED_CPF }),
    )
    expect(logger.shouldLog("http")).toBe(true)
  })

  it("keeps the logger's own `this`", () => {
    const inner = {
      prefix: "x",
      shouldLog(this: { prefix: string }) {
        return this.prefix === "x"
      },
    }

    expect(redactingLogger(inner as unknown as Logger).shouldLog("info")).toBe(true)
  })

  it("passes non-function members through", () => {
    const logger = redactingLogger(fakeLogger() as unknown as Logger) as unknown as {
      level: string
    }

    expect(logger.level).toBe("info")
  })
})
