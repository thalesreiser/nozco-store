import type { MedusaContainer, RemoteQueryInput } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils"
import { queryList, type WithSalesChannels } from "../store-setup/query"
import {
  type CatalogProduct,
  type CatalogProductRow,
  type OrderRow,
  sumUnitsSold,
  toCatalogProduct,
} from "./listing"

const PAGE_SIZE = 200

/**
 * The orders counted by `best_selling`. Pending with Thales, see the BE-02.4 PR. An order exists only
 * after payment, so what is left out is what never counted as a sale: canceled orders and drafts.
 */
export const BEST_SELLER_WINDOW_DAYS = 90

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "subtitle",
  "description",
  "thumbnail",
  "created_at",
  "metadata",
  "options.id",
  "options.title",
  "options.values.id",
  "options.values.value",
  "options.values.option_id",
  "images.id",
  "images.url",
  "images.rank",
  "categories.id",
  "categories.handle",
  "categories.name",
  "categories.is_active",
  "categories.is_internal",
  "collection.id",
  "collection.handle",
  "collection.title",
  "tags.value",
  "sales_channels.id",
  "variants.id",
  "variants.product_id",
  "variants.title",
  "variants.sku",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.options.id",
  "variants.options.value",
  "variants.options.option_id",
  "variants.images.id",
  "variants.images.url",
  "variants.images.rank",
  "variants.calculated_price.*",
]

/** A page at a time, because `query.graph` applies no limit of its own that this code can rely on. */
async function readAll<T>(container: MedusaContainer, input: RemoteQueryInput<string>) {
  const rows: T[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await queryList<T>(container, {
      ...input,
      pagination: { skip, take: PAGE_SIZE, order: { id: "ASC" } },
    })
    rows.push(...page)
    if (page.length < PAGE_SIZE) {
      return rows
    }
  }
}

export type CatalogScope = { regionId: string; currencyCode: string; salesChannelId: string }

/**
 * The published products of the sales channel, priced for the region, with availability. The catalog is
 * small (hundreds of products at most, Q-09), so the listing filters this in memory instead of asking
 * Medusa's Index Module, which needs its own infrastructure, for option, price and text filters.
 */
export async function loadCatalog(
  container: MedusaContainer,
  scope: CatalogScope,
  filters: { handle?: string } = {},
): Promise<CatalogProduct[]> {
  const rows = await readAll<CatalogProductRow & WithSalesChannels>(container, {
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { status: ProductStatus.PUBLISHED, ...filters },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: scope.regionId,
          currency_code: scope.currencyCode,
        }),
      },
    },
  })
  const inChannel = rows.filter((row) =>
    row.sales_channels?.some((channel) => channel?.id === scope.salesChannelId),
  )
  const variantIds = inChannel.flatMap((row) =>
    (row.variants ?? []).filter((v) => v.manage_inventory !== false).map((v) => v.id),
  )
  const availability = variantIds.length
    ? await getVariantAvailability(container.resolve(ContainerRegistrationKeys.QUERY), {
        variant_ids: variantIds,
        sales_channel_id: scope.salesChannelId,
      })
    : {}
  return inChannel.flatMap((row) => {
    const item = toCatalogProduct(row, availability)
    return item ? [item] : []
  })
}

export async function loadUnitsSold(container: MedusaContainer, salesChannelId: string) {
  const since = new Date(Date.now() - BEST_SELLER_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const orders = await readAll<OrderRow>(container, {
    entity: "order",
    fields: ["id", "items.product_id", "items.quantity"],
    filters: {
      sales_channel_id: salesChannelId,
      is_draft_order: false,
      status: { $nin: ["canceled", "draft"] },
      created_at: { $gte: since.toISOString() },
    },
  })
  return sumUnitsSold(orders)
}
