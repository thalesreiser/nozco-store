import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { removeCustomerAccountWorkflow } from "@medusajs/medusa/core-flows"
import { anonymiseCustomer } from "../../../../../lib/privacy/anonymise"
import { adminView } from "../../../../../lib/privacy/requests"
import { sendApiError } from "../../../../utils/api-error"
import { loadForReview } from "../../../../utils/privacy-review"

/** The operator's approval is what runs an anonymisation, which cannot be undone. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const loaded = await loadForReview(req, res, "approve")
  if (!loaded) {
    return
  }
  const { log, request } = loaded
  const decision = { decided_by: req.auth_context.actor_id, decided_at: new Date() }
  try {
    await anonymiseCustomer(
      {
        customers: req.scope.resolve(Modules.CUSTOMER),
        carts: req.scope.resolve(Modules.CART),
        removeAccount: async (customerId) => {
          await removeCustomerAccountWorkflow(req.scope).run({ input: { customerId } })
        },
      },
      request.customer_id,
    )
    const done = await log.updatePrivacyRequests({
      id: request.id,
      ...decision,
      status: "completed",
      completed_at: new Date(),
      failure_code: null,
    })
    res.status(200).json({ request: adminView(done) })
  } catch (error) {
    await log.updatePrivacyRequests({
      id: request.id,
      ...decision,
      status: "failed",
      failure_code: "anonymisation_failed",
    })
    // The name only: a database error message can quote the values it was given.
    req.scope
      .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      .error(`Privacy request ${request.id} failed: ${(error as Error).name}`)
    sendApiError(res, 500, {
      code: "anonymisation_failed",
      message: "The anonymisation did not finish. Approving again resumes it.",
    })
  }
}
