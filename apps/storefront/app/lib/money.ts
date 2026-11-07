import type { Cents } from "@nozco/shared-types"

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/**
 * Formats integer cents as BRL. A non-integer means Medusa's major units (20.5 is R$ 20,50) got past
 * store-mappers.ts, and showing it would quote the wrong price, so it throws instead.
 */
export function formatBrl(cents: Cents): string {
  if (!Number.isInteger(cents)) {
    throw new RangeError(`Expected integer cents, got ${cents}`)
  }
  return brl.format(cents / 100)
}
