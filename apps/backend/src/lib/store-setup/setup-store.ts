import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createPricePreferencesWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"
import { STORE_SETUP, type StoreSetupConfig } from "./constants"
import {
  buildStoreData,
  type ExistingApiKey,
  type ExistingRegion,
  type ExistingStore,
  firstCreated,
  findActivePublishableKey,
  findByName,
  idsToLink,
  needsTaxInclusiveUpdate,
  planRegion,
  planStoreUpdate,
} from "./plan"
import { queryList, type WithSalesChannels } from "./query"

export type StoreSetupResult = {
  storeId: string
  regionId: string
  salesChannelId: string
  publishableApiKeyId: string
  stockLocationId: string
}

/**
 * Brings the store to the configuration in `constants.ts`: Brazil region in BRL with tax-inclusive
 * prices, the `loja-online` sales channel with its publishable key, and the warehouse stock location.
 *
 * Idempotent: every record is looked up first and only what is missing is created or linked, so a
 * second run changes nothing. Each step runs its own core workflow; if one fails, rerunning the setup
 * resumes from the missing pieces.
 */
export async function setupStore(
  container: MedusaContainer,
  config: StoreSetupConfig = STORE_SETUP,
): Promise<StoreSetupResult> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const regionId = await ensureRegion(container, config)
  await ensureTaxRegion(container, config)
  const salesChannelId = await ensureSalesChannel(container, config)
  const publishableApiKeyId = await ensurePublishableKey(container, config, salesChannelId)
  const stockLocationId = await ensureStockLocation(container, config, salesChannelId)
  const storeId = await ensureStore(container, config, {
    regionId,
    salesChannelId,
    locationId: stockLocationId,
  })

  logger.info("Store setup is up to date (BE-01.2)")
  return { storeId, regionId, salesChannelId, publishableApiKeyId, stockLocationId }
}

async function ensureRegion(container: MedusaContainer, config: StoreSetupConfig) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { region, currencyCode, pricesIncludeTaxes } = config

  const regions = await queryList<ExistingRegion>(container, {
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })
  const plan = planRegion(regions, region.countryCode, currencyCode)

  if (plan.action === "create") {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: region.name,
            currency_code: currencyCode,
            countries: [region.countryCode],
            automatic_taxes: true,
            is_tax_inclusive: pricesIncludeTaxes,
          },
        ],
      },
    })
    logger.info(`Created region "${region.name}"`)
    return firstCreated(result, "region").id
  }

  await ensureRegionTaxInclusive(container, plan.id, pricesIncludeTaxes)
  return plan.id
}

async function ensureRegionTaxInclusive(
  container: MedusaContainer,
  regionId: string,
  isTaxInclusive: boolean,
) {
  const pricing = container.resolve(Modules.PRICING)
  const [preference] = await pricing.listPricePreferences({
    attribute: "region_id",
    value: regionId,
  })
  if (!needsTaxInclusiveUpdate(preference, isTaxInclusive)) {
    return
  }
  if (preference) {
    await updateRegionsWorkflow(container).run({
      input: { selector: { id: regionId }, update: { is_tax_inclusive: isTaxInclusive } },
    })
  } else {
    await createPricePreferencesWorkflow(container).run({
      input: [{ attribute: "region_id", value: regionId, is_tax_inclusive: isTaxInclusive }],
    })
  }
}

async function ensureTaxRegion(container: MedusaContainer, config: StoreSetupConfig) {
  const { countryCode, taxProviderId } = config.region

  const taxRegions = await queryList<{ id: string }>(container, {
    entity: "tax_region",
    fields: ["id"],
    filters: { country_code: countryCode, parent_id: null },
  })
  if (taxRegions.length > 0) {
    return
  }
  await createTaxRegionsWorkflow(container).run({
    input: [{ country_code: countryCode, provider_id: taxProviderId }],
  })
}

async function ensureSalesChannel(container: MedusaContainer, config: StoreSetupConfig) {
  const { name, description } = config.salesChannel

  const channels = await queryList<{ id: string; name: string }>(container, {
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name },
  })
  const existing = findByName(channels, name)
  if (existing) {
    return existing.id
  }
  const { result } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name, description }] },
  })
  return firstCreated(result, "sales channel").id
}

async function ensurePublishableKey(
  container: MedusaContainer,
  config: StoreSetupConfig,
  salesChannelId: string,
) {
  const { title } = config.publishableApiKey

  const keys = await queryList<ExistingApiKey & WithSalesChannels>(container, {
    entity: "api_key",
    fields: ["id", "title", "type", "revoked_at", "sales_channels.id"],
    filters: { type: "publishable", title },
  })
  const existing = findActivePublishableKey(keys, title)
  let keyId = existing?.id

  if (!keyId) {
    const { result } = await createApiKeysWorkflow(container).run({
      input: { api_keys: [{ title, type: "publishable", created_by: "" }] },
    })
    keyId = firstCreated(result, "publishable API key").id
  }

  const add = idsToLink(existing?.sales_channels, salesChannelId)
  if (add.length > 0) {
    await linkSalesChannelsToApiKeyWorkflow(container).run({ input: { id: keyId, add } })
  }
  return keyId
}

async function ensureStockLocation(
  container: MedusaContainer,
  config: StoreSetupConfig,
  salesChannelId: string,
) {
  const { name, address } = config.stockLocation

  const locations = await queryList<{ id: string; name: string } & WithSalesChannels>(container, {
    entity: "stock_location",
    fields: ["id", "name", "sales_channels.id"],
    filters: { name },
  })
  const existing = findByName(locations, name)
  let locationId = existing?.id

  if (!locationId) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          { name, address: { country_code: address.countryCode, address_1: address.address1 } },
        ],
      },
    })
    locationId = firstCreated(result, "stock location").id
  }

  const add = idsToLink(existing?.sales_channels, salesChannelId)
  if (add.length > 0) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: locationId, add },
    })
  }
  return locationId
}

async function ensureStore(
  container: MedusaContainer,
  config: StoreSetupConfig,
  ids: { regionId: string; salesChannelId: string; locationId: string },
) {
  const pricing = container.resolve(Modules.PRICING)
  const desired = {
    name: config.store.name,
    currencyCode: config.currencyCode,
    pricesIncludeTaxes: config.pricesIncludeTaxes,
    ...ids,
  }

  const stores = await queryList<ExistingStore>(container, {
    entity: "store",
    fields: [
      "id",
      "name",
      "default_sales_channel_id",
      "default_region_id",
      "default_location_id",
      "supported_currencies.currency_code",
      "supported_currencies.is_default",
    ],
  })
  const [store] = stores

  // `medusa db:migrate` runs before the first boot, when Medusa has not created its default store
  // yet. Creating it here makes the boot-time defaults skip the store.
  if (!store) {
    const { result } = await createStoresWorkflow(container).run({
      input: { stores: [buildStoreData(desired)] },
    })
    return firstCreated(result, "store").id
  }

  const [currencyPreference] = await pricing.listPricePreferences({
    attribute: "currency_code",
    value: config.currencyCode,
  })
  const update = planStoreUpdate(store, desired, currencyPreference?.is_tax_inclusive)
  if (update) {
    await updateStoresWorkflow(container).run({ input: { selector: { id: store.id }, update } })
  }
  return store.id
}
