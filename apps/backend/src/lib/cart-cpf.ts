import type { ICartModuleService } from "@medusajs/framework/types"
import { isValidCpf, normalizeCpf } from "@nozco/shared-types"
import { isPlainObject } from "./log-redaction"

/**
 * The only place that knows where the CPF lives, so that moving it means changing this file. For now
 * it is a metadata key on the cart, the most reversible option: no migration, and it works with guest
 * checkout and with accounts. Medusa copies cart metadata to the order on completion. The storage
 * decision is still open (see the BE-03.1 PR).
 */
const METADATA_KEY = "cpf"

type CartStore = Pick<ICartModuleService, "listCarts" | "updateCarts">

export type SaveCartCpfResult = "saved" | "cart_not_found" | "cart_completed"

/** Takes a CPF already validated by `cpfSchema`. */
export async function saveCartCpf(
  carts: CartStore,
  cartId: string,
  cpf: string,
): Promise<SaveCartCpfResult> {
  const [cart] = await carts.listCarts(
    { id: cartId },
    { select: ["id", "completed_at", "metadata"] },
  )
  if (!cart) {
    return "cart_not_found"
  }
  if (cart.completed_at) {
    return "cart_completed"
  }
  await carts.updateCarts(cartId, { metadata: { ...cart.metadata, [METADATA_KEY]: cpf } })
  return "saved"
}

/**
 * Reads the CPF of a cart or order. Medusa's own cart route lets a client write any metadata, so the
 * value is validated again here, and an invalid one counts as no CPF.
 */
export function readCpfFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const value = metadata?.[METADATA_KEY]
  return typeof value === "string" && isValidCpf(value) ? normalizeCpf(value) : null
}

function omitCpf(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => key !== METADATA_KEY))
}

/** A copy of a response body with the CPF removed from every `metadata` object. */
export function withoutCpfInMetadata(body: unknown): unknown {
  if (Array.isArray(body)) {
    return body.map(withoutCpfInMetadata)
  }
  if (typeof body !== "object" || body === null || !isPlainObject(body)) {
    return body
  }
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      key === "metadata" && typeof value === "object" && value !== null
        ? omitCpf(value as Record<string, unknown>)
        : withoutCpfInMetadata(value),
    ]),
  )
}
