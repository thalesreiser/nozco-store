import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { type CpfPayload, maskCpf } from "@nozco/shared-types"
import { saveCartCpf } from "../../../../../lib/cart-cpf"
import { sendApiError } from "../../../../utils/api-error"

/**
 * Sets the CPF of a cart; `middlewares.ts` validates the body. As in Medusa's own cart routes, holding
 * the cart ID is the authorisation. The answer holds the masked CPF only.
 */
export async function POST(req: MedusaRequest<CpfPayload>, res: MedusaResponse): Promise<void> {
  const { cpf } = req.validatedBody
  const carts = req.scope.resolve(Modules.CART)
  const result = await saveCartCpf(carts, req.params.id as string, cpf)

  if (result === "cart_not_found") {
    sendApiError(res, 404, { code: result, message: "The cart does not exist." })
    return
  }
  if (result === "cart_completed") {
    sendApiError(res, 409, { code: result, message: "The cart is already completed." })
    return
  }
  res.status(200).json({ cpf: maskCpf(cpf) })
}
