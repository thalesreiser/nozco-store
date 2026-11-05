import { describe, expect, it } from "vitest"
import { cpfPayloadSchema, cpfSchema, isValidCpf, maskCpf, normalizeCpf } from "../src/index.js"

// Fictional sequences, never taken from a person. The check digits are written apart from the base and
// were worked out from the published algorithm, not with this code. A CPF is only assembled at run time.
const samples = [
  ["123456789", "09"], // the first check digit comes out as 10 and counts as 0
  ["100200302", "40"], // the second check digit comes out as 10 and counts as 0
  ["987654321", "00"],
  ["000000001", "91"],
] as const

const unmasked = (base: string, check: string) => `${base}${check}`
const masked = (base: string, check: string) =>
  `${base.slice(0, 3)}.${base.slice(3, 6)}.${base.slice(6)}-${check}`

const [base, check] = samples[0]
const validCpf = unmasked(base, check)
const validMasked = masked(base, check)

describe("isValidCpf", () => {
  it.each(samples)("accepts %s with check digits %s, masked or not", (sampleBase, sampleCheck) => {
    expect(isValidCpf(unmasked(sampleBase, sampleCheck))).toBe(true)
    expect(isValidCpf(masked(sampleBase, sampleCheck))).toBe(true)
  })

  it.each(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])(
    "rejects eleven repeated %s, although some pass the check digits",
    (digit) => {
      expect(isValidCpf(digit.repeat(11))).toBe(false)
    },
  )

  it("rejects a wrong first check digit", () => {
    expect(isValidCpf(unmasked(base, "19"))).toBe(false)
  })

  it("rejects a wrong second check digit", () => {
    expect(isValidCpf(unmasked(base, "01"))).toBe(false)
  })

  it.each([
    ["empty", ""],
    ["too short", base],
    ["too long", `${validCpf}0`],
    ["letters", `abc${validCpf.slice(3)}`],
    ["stray separators", `${base}/${check}`],
    ["digits with text around", `cpf ${validCpf}`],
  ])("rejects %s", (_name, input) => {
    expect(isValidCpf(input)).toBe(false)
  })

  it("ignores surrounding spaces", () => {
    expect(isValidCpf(` ${validMasked} `)).toBe(true)
  })
})

describe("normalizeCpf", () => {
  it("keeps only the digits", () => {
    expect(normalizeCpf(validMasked)).toBe(validCpf)
  })
})

describe("cpfSchema", () => {
  it.each([validCpf, validMasked])("normalises a valid value to digits", (input) => {
    expect(cpfSchema.parse(input)).toBe(validCpf)
  })

  it("rejects an invalid value without holding it in the error", () => {
    const invalid = unmasked(base, "01")
    const result = cpfSchema.safeParse(invalid)

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("must be a valid CPF")
    expect(JSON.stringify(result.error)).not.toContain(invalid)
    expect(String(result.error)).not.toContain(invalid)
  })

  it.each([[12345678909], [null], [undefined], [{}]])("rejects the non-string %j", (input) => {
    expect(cpfSchema.safeParse(input).success).toBe(false)
  })
})

describe("cpfPayloadSchema", () => {
  it("outputs the digits under `cpf`", () => {
    expect(cpfPayloadSchema.parse({ cpf: validMasked })).toEqual({ cpf: validCpf })
  })

  it("names the field in the error", () => {
    const result = cpfPayloadSchema.safeParse({ cpf: "000" })

    expect(result.error?.issues[0]?.path).toEqual(["cpf"])
  })
})

describe("maskCpf", () => {
  it.each([validCpf, validMasked])("keeps only the check digits", (input) => {
    expect(maskCpf(input)).toBe(`***.***.***-${check}`)
  })

  it.each(["", "abc", base, unmasked(base, "01"), "1".repeat(11)])(
    "fully masks the invalid value %j",
    (input) => {
      expect(maskCpf(input)).toBe("***.***.***-**")
    },
  )
})
