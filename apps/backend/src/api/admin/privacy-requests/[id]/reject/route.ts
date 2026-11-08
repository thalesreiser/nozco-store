import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { PrivacyRequestRejection } from "@nozco/shared-types"
import { adminView } from "../../../../../lib/privacy/requests"
import { sendApiError } from "../../../../utils/api-error"
import { loadForReview } from "../../../../utils/privacy-review"

/** Closes a deletion request and changes no customer data. The customer reads the reason. */
export async function POST(
  req: AuthenticatedMedusaRequest<PrivacyRequestRejection>,
  res: MedusaResponse,
): Promise<void> {
  const loaded = await loadForReview(req, res, "reject")
  if (!loaded) {
    return
  }
  try {
    const rejected = await loaded.log.updatePrivacyRequests({
      id: loaded.request.id,
      status: "rejected",
      decided_by: req.auth_context.actor_id,
      decided_at: new Date(),
      rejection_reason: req.validatedBody.reason,
    })
    res.status(200).json({ request: adminView(rejected) })
  } catch (error) {
    // The name only: a database error message can quote the reason it was given.
    req.scope
      .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      .error(`Privacy request ${loaded.request.id} was not rejected: ${(error as Error).name}`)
    sendApiError(res, 500, {
      code: "rejection_failed",
      message: "The rejection was not saved. Try again.",
    })
  }
}
