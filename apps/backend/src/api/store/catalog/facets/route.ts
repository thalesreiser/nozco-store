import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { storeProductFacetsRequestSchema } from "@nozco/shared-types"
import { buildFacets } from "../../../../lib/catalog/listing"
import { loadCatalog } from "../../../../lib/catalog/load"
import { resolveCatalogRequest } from "../../../utils/catalog-scope"

/** The sizes, colours and price range to offer as filters, for the filters already applied. */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const request = await resolveCatalogRequest(req, res, storeProductFacetsRequestSchema)
  if (!request) {
    return
  }
  res.json(buildFacets(await loadCatalog(req.scope, request.scope), request.query))
}
