import type { MedusaResponse, MedusaStoreRequest } from "@medusajs/framework/http"
import { queryList } from "../../lib/store-setup/query"
import type { CatalogScope } from "../../lib/catalog/load"
import { sendApiError } from "./api-error"
import { type PayloadSchema, parsePayload } from "./validate-payload"

/**
 * Validates the query string and finds the region and sales channel of a catalog request. On failure it
 * has already answered with `{ code, message }` and returns null. Validation lives here and not in
 * `middlewares.ts` because the products route is also the prefix of the single-product route.
 */
export async function resolveCatalogRequest<T extends { region_id: string }>(
  req: MedusaStoreRequest,
  res: MedusaResponse,
  schema: PayloadSchema<T>,
): Promise<{ query: T; scope: CatalogScope } | null> {
  const parsed = parsePayload(schema, req.query)
  if (!parsed.ok) {
    sendApiError(res, 400, parsed.error)
    return null
  }
  const channels = req.publishable_key_context?.sales_channel_ids ?? []
  const [salesChannelId] = channels
  if (channels.length !== 1 || !salesChannelId) {
    sendApiError(res, 400, {
      code: "sales_channel_not_resolved",
      message: "The publishable key must have exactly one sales channel.",
    })
    return null
  }
  const [region] = await queryList<{ id: string; currency_code: string }>(req.scope, {
    entity: "region",
    fields: ["id", "currency_code"],
    filters: { id: parsed.data.region_id },
  })
  if (!region) {
    sendApiError(res, 400, { code: "region_not_found", message: "The region does not exist." })
    return null
  }
  return {
    query: parsed.data,
    scope: { regionId: region.id, currencyCode: region.currency_code, salesChannelId },
  }
}
