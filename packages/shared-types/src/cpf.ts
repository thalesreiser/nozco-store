import { z } from "zod"

/** Eleven digits, with the usual separators optional: `000.000.000-00` or `00000000000`. */
const CPF_SHAPE = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/

const FULLY_MASKED_CPF = "***.***.***-**"

/** Strips the separators. Does not validate: use `cpfSchema` or `isValidCpf` for that. */
export function normalizeCpf(input: string): string {
  return input.replace(/\D/g, "")
}

/** Weights run from `digits.length + 1` down to 2; a result of 10 counts as 0. */
function checkDigit(digits: string): number {
  const sum = [...digits].reduce(
    (total, digit, index) => total + Number(digit) * (digits.length + 1 - index),
    0,
  )
  return ((sum * 10) % 11) % 10
}

/** Takes masked or unmasked input. Rejects other shapes, repeated digits and wrong check digits. */
export function isValidCpf(input: string): boolean {
  const value = input.trim()
  if (!CPF_SHAPE.test(value)) {
    return false
  }
  const digits = normalizeCpf(value)
  if (/^(\d)\1+$/.test(digits)) {
    return false
  }
  const first = checkDigit(digits.slice(0, 9))
  const second = checkDigit(digits.slice(0, 10))
  return digits.endsWith(`${first}${second}`)
}

/**
 * Shared by the storefront forms and the backend routes. The output is digits only. Its error never
 * holds the submitted value, so it is safe to return and to log.
 */
export const cpfSchema = z
  .string()
  .refine(isValidCpf, { message: "must be a valid CPF" })
  .transform(normalizeCpf)

/** Body of a request that sets the customer's CPF. */
export const cpfPayloadSchema = z.object({ cpf: cpfSchema })

export type CpfPayload = z.infer<typeof cpfPayloadSchema>

/**
 * For display: keeps only the two check digits, which say little about the rest. Anything that is not
 * a valid CPF comes out fully masked, so a typo is not echoed either.
 */
export function maskCpf(input: string): string {
  if (!isValidCpf(input)) {
    return FULLY_MASKED_CPF
  }
  return `***.***.***-${normalizeCpf(input).slice(-2)}`
}
