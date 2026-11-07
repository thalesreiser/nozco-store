import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { storeHomeContentRequestSchema } from "@nozco/shared-types"
import { buildHomeContent } from "../../../../lib/content/home"
import { CONTENT_MODULE } from "../../../../modules/content"
import type ContentModuleService from "../../../../modules/content/service"
import { sendApiError } from "../../../utils/api-error"
import { parsePayload } from "../../../utils/validate-payload"

/** The banners and announcements of the home page. Drafts are not even read. */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const parsed = parsePayload(storeHomeContentRequestSchema, req.query)
  if (!parsed.ok) {
    sendApiError(res, 400, parsed.error)
    return
  }
  const content = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const [banners, announcements] = await Promise.all([
    content.listHomeBanners({ is_published: true }),
    content.listHomeAnnouncements({ is_published: true }),
  ])
  res.json(buildHomeContent({ banners, announcements }, new Date()))
}
