import { MedusaError } from "@medusajs/framework/utils"

export function invalid(message: string) {
  return new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

/**
 * Medusa v2 stores major units: 20.5 is R$ 20,50. This cannot tell R$ 2.050,00 from 2050 cents typed by
 * mistake, but it rejects what cannot be a BRL price.
 */
export function assertMajorUnits(amount: number, what: string) {
  const cents = amount * 100
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(cents - Math.round(cents)) > 1e-6) {
    throw invalid(`${what} must be above zero with at most two decimals, in reais: got ${amount}`)
  }
}
