import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { storeProductListRequestSchema } from "@nozco/shared-types"
import { filterCatalog, sortCatalog } from "../../../../lib/catalog/listing"
import { loadCatalog, loadUnitsSold } from "../../../../lib/catalog/load"
import { resolveCatalogRequest } from "../../../utils/catalog-scope"

/** The store listing: size, colour and price filters, text search and the store's sort orders. */
export async function GET(req: MedusaStoreRequest, res: MedusaResponse): Promise<void> {
  const request = await resolveCatalogRequest(req, res, storeProductListRequestSchema)
  if (!request) {
    return
  }
  const { query, scope } = request
  const matches = filterCatalog(await loadCatalog(req.scope, scope), query)
  const unitsSold =
    query.order === "best_selling"
      ? await loadUnitsSold(req.scope, scope.salesChannelId)
      : undefined
  const page = sortCatalog(matches, query.order, unitsSold).slice(
    query.offset,
    query.offset + query.limit,
  )
  res.json({
    products: page.map((item) => item.product),
    count: matches.length,
    limit: query.limit,
    offset: query.offset,
  })
}
