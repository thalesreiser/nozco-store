import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { storeProductRequestSchema } from "@nozco/shared-types"
import { loadCatalog } from "../../../../../lib/catalog/load"
import { sendApiError } from "../../../../utils/api-error"
import { resolveCatalogRequest } from "../../../../utils/catalog-scope"

/** One product by handle, with the same public fields and availability as the listing. */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const request = await resolveCatalogRequest(req, res, storeProductRequestSchema)
  if (!request) {
    return
  }
  const [item] = await loadCatalog(req.scope, request.scope, {
    handle: req.params.handle as string,
  })
  if (!item) {
    sendApiError(res, 404, { code: "product_not_found", message: "The product does not exist." })
    return
  }
  res.json({ product: item.product })
}
