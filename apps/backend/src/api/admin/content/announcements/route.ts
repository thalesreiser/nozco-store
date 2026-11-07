import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { contentListQuerySchema, homeAnnouncementPayloadSchema } from "@nozco/shared-types"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"
import { sendApiError } from "../../../utils/api-error"
import { parsePayload } from "../../../utils/validate-payload"

/** Every announcement, drafts included, in display order. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = parsePayload(contentListQuerySchema, req.query)
  if (!parsed.ok) {
    sendApiError(res, 400, parsed.error)
    return
  }
  const { limit, offset } = parsed.data
  const [announcements, count] = await req.scope
    .resolve<ContentModuleService>(CONTENT_MODULE)
    .listAndCountHomeAnnouncements(
      {},
      { order: { rank: "ASC", id: "ASC" }, take: limit, skip: offset },
    )
  res.status(200).json({ announcements, count, limit, offset })
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = parsePayload(homeAnnouncementPayloadSchema, req.body)
  if (!parsed.ok) {
    sendApiError(res, 400, parsed.error)
    return
  }
  const announcement = await req.scope
    .resolve<ContentModuleService>(CONTENT_MODULE)
    .createHomeAnnouncements(parsed.data)
  res.status(201).json({ announcement })
}
