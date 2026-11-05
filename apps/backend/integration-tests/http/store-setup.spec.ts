import { Modules } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { STORE_SETUP } from "../../src/lib/store-setup/constants"
import type { ExistingRegion, ExistingStore } from "../../src/lib/store-setup/plan"
import { queryList, type WithSalesChannels } from "../../src/lib/store-setup/query"
import { setupStore } from "../../src/lib/store-setup/setup-store"

jest.setTimeout(120 * 1000)

const channelIds = (row: WithSalesChannels | undefined) =>
  row?.sales_channels?.map((channel) => channel?.id)

// The runner boots the app, so Medusa's own defaults (store in EUR, "Default Sales Channel",
// "Default Publishable API Key") already exist: this also covers updating that default store.
medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("store setup (BE-01.2)", () => {
      it("configures the store once, however many times it runs", async () => {
        const container = getContainer()

        const first = await setupStore(container)
        const second = await setupStore(container)
        expect(second).toEqual(first)

        const regions = await queryList<ExistingRegion>(container, {
          entity: "region",
          fields: ["id", "name", "currency_code", "countries.iso_2"],
        })
        const brazil = regions.filter((region) =>
          region.countries?.some((country) => country?.iso_2 === "br"),
        )
        expect(brazil).toEqual([
          expect.objectContaining({ id: first.regionId, currency_code: "brl" }),
        ])

        const channels = await queryList<{ id: string }>(container, {
          entity: "sales_channel",
          fields: ["id"],
          filters: { name: STORE_SETUP.salesChannel.name },
        })
        expect(channels).toEqual([{ id: first.salesChannelId }])

        const keys = await queryList<WithSalesChannels>(container, {
          entity: "api_key",
          fields: ["id", "sales_channels.id"],
          filters: { type: "publishable", title: STORE_SETUP.publishableApiKey.title },
        })
        expect(keys).toHaveLength(1)
        expect(channelIds(keys[0])).toEqual([first.salesChannelId])

        const locations = await queryList<WithSalesChannels>(container, {
          entity: "stock_location",
          fields: ["id", "sales_channels.id"],
          filters: { name: STORE_SETUP.stockLocation.name },
        })
        expect(locations).toHaveLength(1)
        expect(channelIds(locations[0])).toEqual([first.salesChannelId])

        const taxRegions = await queryList<{ id: string }>(container, {
          entity: "tax_region",
          fields: ["id"],
          filters: { country_code: STORE_SETUP.region.countryCode },
        })
        expect(taxRegions).toHaveLength(1)

        const stores = await queryList<ExistingStore>(container, {
          entity: "store",
          fields: [
            "id",
            "name",
            "default_sales_channel_id",
            "default_region_id",
            "default_location_id",
            "supported_currencies.currency_code",
          ],
        })
        expect(stores).toHaveLength(1)
        expect(stores[0]).toEqual(
          expect.objectContaining({
            name: STORE_SETUP.store.name,
            default_sales_channel_id: first.salesChannelId,
            default_region_id: first.regionId,
            default_location_id: first.stockLocationId,
          }),
        )
        expect(stores[0]?.supported_currencies?.map((entry) => entry?.currency_code)).toEqual([
          "brl",
        ])

        const pricing = container.resolve(Modules.PRICING)
        const regionPreferences = await pricing.listPricePreferences({
          attribute: "region_id",
          value: first.regionId,
        })
        const currencyPreferences = await pricing.listPricePreferences({
          attribute: "currency_code",
          value: STORE_SETUP.currencyCode,
        })
        expect(regionPreferences.map((preference) => preference.is_tax_inclusive)).toEqual([true])
        expect(currencyPreferences.map((preference) => preference.is_tax_inclusive)).toEqual([true])
      })

      // `medusa db:migrate` runs the setup before the first boot, when no store exists yet.
      it("creates the store when none exists", async () => {
        const container = getContainer()
        const storeModule = container.resolve(Modules.STORE)
        const existing = await storeModule.listStores()
        await storeModule.deleteStores(existing.map((store) => store.id))

        const { storeId, regionId, salesChannelId, stockLocationId } = await setupStore(container)

        const stores = await queryList<ExistingStore>(container, {
          entity: "store",
          fields: [
            "id",
            "name",
            "default_sales_channel_id",
            "default_region_id",
            "default_location_id",
          ],
        })
        expect(stores).toEqual([
          expect.objectContaining({
            id: storeId,
            name: STORE_SETUP.store.name,
            default_sales_channel_id: salesChannelId,
            default_region_id: regionId,
            default_location_id: stockLocationId,
          }),
        ])
      })

      it("lets the storefront read the Brazil region with the publishable key", async () => {
        const container = getContainer()
        const { publishableApiKeyId } = await setupStore(container)
        const [key] = await queryList<{ token: string }>(container, {
          entity: "api_key",
          fields: ["token"],
          filters: { id: publishableApiKeyId },
        })

        const response = (await api.get("/store/regions", {
          headers: { "x-publishable-api-key": key?.token },
        })) as { status: number; data: { regions: unknown[] } }

        expect(response.status).toBe(200)
        expect(response.data.regions).toEqual([
          expect.objectContaining({ name: STORE_SETUP.region.name, currency_code: "brl" }),
        ])
      })
    })
  },
})
