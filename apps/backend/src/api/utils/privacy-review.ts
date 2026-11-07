import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  type PrivacyRequestRow,
  type ReviewAction,
  reviewRefusal,
} from "../../lib/privacy/requests"
import { PRIVACY_REQUEST_MODULE } from "../../modules/privacy-request"
import type PrivacyRequestModuleService from "../../modules/privacy-request/service"
import { sendApiError } from "./api-error"

/** Loads the request of `:id`, or answers 404 or 409 and returns null. */
export async function loadForReview(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  action: ReviewAction,
): Promise<{ log: PrivacyRequestModuleService; request: PrivacyRequestRow } | null> {
  const log = req.scope.resolve<PrivacyRequestModuleService>(PRIVACY_REQUEST_MODULE)
  const [request] = await log.listPrivacyRequests({ id: req.params.id })
  if (!request) {
    sendApiError(res, 404, { code: "request_not_found", message: "The request does not exist." })
    return null
  }
  const refusal = reviewRefusal(request, action)
  if (refusal) {
    sendApiError(res, 409, refusal)
    return null
  }
  return { log, request }
}
