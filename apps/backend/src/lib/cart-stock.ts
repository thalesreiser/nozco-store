export interface CartLineQuantity {
  variant_id?: string | null
  quantity?: unknown
}

export interface VariantTotal {
  variant_id: string
  quantity: number
}

/**
 * The total of each variant held in more than one line. Medusa checks stock one line at a time, and it
 * keeps a variant in separate lines when their metadata differs. A variant in a single line needs nothing
 * here, because Medusa's own check covers it.
 */
export function totalsOfSplitVariants(lines: CartLineQuantity[]): VariantTotal[] {
  const totals = new Map<string, { quantity: number; lines: number }>()
  for (const { variant_id, quantity } of lines) {
    if (!variant_id) continue
    const total = totals.get(variant_id) ?? { quantity: 0, lines: 0 }
    totals.set(variant_id, {
      quantity: total.quantity + Number(quantity ?? 1),
      lines: total.lines + 1,
    })
  }
  return [...totals]
    .filter(([, total]) => total.lines > 1)
    .map(([variant_id, total]) => ({ variant_id, quantity: total.quantity }))
}

/** The lines of a cart once one of them has its quantity changed. */
export function withLineQuantity<T extends CartLineQuantity & { id: string }>(
  lines: T[],
  lineId: string,
  quantity: unknown,
): T[] {
  return lines.map((line) => (line.id === lineId ? { ...line, quantity } : line))
}
