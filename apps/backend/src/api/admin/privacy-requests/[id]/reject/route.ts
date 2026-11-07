import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { adminView } from "../../../../../lib/privacy/requests"
import { loadForReview } from "../../../../utils/privacy-review"

/** Closes a deletion request and changes no customer data. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const loaded = await loadForReview(req, res, "reject")
  if (!loaded) {
    return
  }
  const rejected = await loaded.log.updatePrivacyRequests({
    id: loaded.request.id,
    status: "rejected",
    decided_by: req.auth_context.actor_id,
    decided_at: new Date(),
  })
  res.status(200).json({ request: adminView(rejected) })
}
