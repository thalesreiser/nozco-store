import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { homeBannerPayloadSchema } from "@nozco/shared-types"
import { CONTENT_MODULE } from "../../../../../modules/content"
import type ContentModuleService from "../../../../../modules/content/service"
import { sendApiError } from "../../../../utils/api-error"
import { parsePayload } from "../../../../utils/validate-payload"

const NOT_FOUND = { code: "not_found", message: "This banner does not exist." }

/** Replaces the banner: the screen always sends every field, so the rules across fields hold. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = parsePayload(homeBannerPayloadSchema, req.body)
  if (!parsed.ok) {
    sendApiError(res, 400, parsed.error)
    return
  }
  const id = req.params.id ?? ""
  const content = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const [found] = await content.listHomeBanners({ id })
  if (!found) {
    sendApiError(res, 404, NOT_FOUND)
    return
  }
  const banner = await content.updateHomeBanners({ id, ...parsed.data })
  res.status(200).json({ banner })
}

/** A soft delete, so a removal made by mistake can still be restored from the database. */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const id = req.params.id ?? ""
  const content = req.scope.resolve<ContentModuleService>(CONTENT_MODULE)
  const [found] = await content.listHomeBanners({ id })
  if (!found) {
    sendApiError(res, 404, NOT_FOUND)
    return
  }
  await content.softDeleteHomeBanners(id)
  res.status(200).json({ id, deleted: true })
}
