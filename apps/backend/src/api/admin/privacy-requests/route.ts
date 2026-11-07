import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { privacyRequestListQuerySchema } from "@nozco/shared-types"
import { adminView } from "../../../lib/privacy/requests"
import { PRIVACY_REQUEST_MODULE } from "../../../modules/privacy-request"
import type PrivacyRequestModuleService from "../../../modules/privacy-request/service"
import { sendApiError } from "../../utils/api-error"
import { parsePayload } from "../../utils/validate-payload"

/** The log of data-subject requests, newest first. It holds customer ids only. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = parsePayload(privacyRequestListQuerySchema, req.query)
  if (!parsed.ok) {
    sendApiError(res, 400, parsed.error)
    return
  }
  const { limit, offset, ...filters } = parsed.data
  const [requests, count] = await req.scope
    .resolve<PrivacyRequestModuleService>(PRIVACY_REQUEST_MODULE)
    .listAndCountPrivacyRequests(filters, {
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    })
  res.status(200).json({ requests: requests.map(adminView), count, limit, offset })
}
