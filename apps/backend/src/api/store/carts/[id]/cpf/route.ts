import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { cpfPayloadSchema, maskCpf } from "@nozco/shared-types"
import { saveCartCpf } from "../../../../../lib/cart-cpf"

/**
 * Sets the CPF of a cart. As in Medusa's own cart routes, holding the cart ID is the authorisation.
 * The answer holds the masked CPF only, and errors never hold the submitted value.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const payload = cpfPayloadSchema.safeParse(req.body)
  if (!payload.success) {
    res.status(400).json({ code: "invalid_cpf", message: "The CPF is not valid." })
    return
  }

  const carts = req.scope.resolve(Modules.CART)
  const result = await saveCartCpf(carts, req.params.id as string, payload.data.cpf)

  if (result === "cart_not_found") {
    res.status(404).json({ code: "cart_not_found", message: "The cart does not exist." })
    return
  }
  if (result === "cart_completed") {
    res.status(409).json({ code: "cart_completed", message: "The cart is already completed." })
    return
  }
  res.status(200).json({ cpf: maskCpf(payload.data.cpf) })
}
