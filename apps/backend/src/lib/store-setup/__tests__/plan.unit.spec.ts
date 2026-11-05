import { STORE_SETUP } from "../constants"
import {
  buildStoreData,
  type DesiredStore,
  type ExistingStore,
  findActivePublishableKey,
  findByName,
  firstCreated,
  idsToLink,
  needsTaxInclusiveUpdate,
  planRegion,
  planStoreUpdate,
} from "../plan"

describe("STORE_SETUP", () => {
  it("targets Brazil in BRL with tax-inclusive prices", () => {
    expect(STORE_SETUP.region.countryCode).toBe("br")
    expect(STORE_SETUP.currencyCode).toBe("brl")
    expect(STORE_SETUP.pricesIncludeTaxes).toBe(true)
    expect(STORE_SETUP.salesChannel.name).toBe("loja-online")
  })

  it("commits no warehouse address beyond the country", () => {
    expect(STORE_SETUP.stockLocation.address).toEqual({ countryCode: "BR", address1: "" })
  })
})

describe("planRegion", () => {
  const europe = {
    id: "reg_eu",
    name: "Europe",
    currency_code: "eur",
    countries: [{ iso_2: "de" }],
  }

  it("creates the region when no region holds the country", () => {
    expect(planRegion([europe], "br", "brl")).toEqual({ action: "create" })
    expect(planRegion([], "br", "brl")).toEqual({ action: "create" })
  })

  it("reuses the region that already holds the country, whatever its name", () => {
    const brazil = { id: "reg_br", name: "BR", currency_code: "BRL", countries: [{ iso_2: "BR" }] }

    expect(planRegion([europe, brazil], "br", "brl")).toEqual({ action: "reuse", id: "reg_br" })
  })

  it("refuses to touch a region that holds the country with another currency", () => {
    const wrong = {
      id: "reg_x",
      name: "Americas",
      currency_code: "usd",
      countries: [{ iso_2: "br" }],
    }

    expect(() => planRegion([wrong], "br", "brl")).toThrow(/Americas.*"br".*"usd"/)
  })

  it("tolerates regions without countries", () => {
    const empty = { id: "reg_e", name: "Empty", currency_code: "brl", countries: null }

    expect(planRegion([empty], "br", "brl")).toEqual({ action: "create" })
  })
})

describe("findByName", () => {
  it("matches the exact name only", () => {
    const items = [
      { id: "sc_1", name: "Default Sales Channel" },
      { id: "sc_2", name: "loja-online" },
    ]

    expect(findByName(items, "loja-online")?.id).toBe("sc_2")
    expect(findByName(items, "Loja-Online")).toBeUndefined()
  })
})

describe("findActivePublishableKey", () => {
  const title = "loja-online storefront"

  it("finds the publishable key with the setup title", () => {
    const keys = [
      { id: "apk_default", title: "Default Publishable API Key", type: "publishable" },
      { id: "apk_store", title, type: "publishable", revoked_at: null },
    ]

    expect(findActivePublishableKey(keys, title)?.id).toBe("apk_store")
  })

  it("ignores revoked keys and secret keys with the same title", () => {
    const keys = [
      { id: "apk_old", title, type: "publishable", revoked_at: "2026-10-01T00:00:00.000Z" },
      { id: "sk_1", title, type: "secret", revoked_at: null },
    ]

    expect(findActivePublishableKey(keys, title)).toBeUndefined()
  })
})

describe("firstCreated", () => {
  it("returns the created record or fails loudly", () => {
    expect(firstCreated([{ id: "reg_1" }], "region")).toEqual({ id: "reg_1" })
    expect(() => firstCreated([], "region")).toThrow(/region returned nothing/)
  })
})

describe("idsToLink", () => {
  it("links when the channel is not linked yet", () => {
    expect(idsToLink([{ id: "sc_other" }], "sc_1")).toEqual(["sc_1"])
    expect(idsToLink(undefined, "sc_1")).toEqual(["sc_1"])
    expect(idsToLink([null], "sc_1")).toEqual(["sc_1"])
  })

  it("does nothing when the link already exists", () => {
    expect(idsToLink([{ id: "sc_other" }, { id: "sc_1" }], "sc_1")).toEqual([])
  })
})

describe("needsTaxInclusiveUpdate", () => {
  it("updates a missing or different preference only", () => {
    expect(needsTaxInclusiveUpdate(undefined, true)).toBe(true)
    expect(needsTaxInclusiveUpdate({ is_tax_inclusive: false }, true)).toBe(true)
    expect(needsTaxInclusiveUpdate({ is_tax_inclusive: true }, true)).toBe(false)
  })
})

describe("planStoreUpdate", () => {
  const desired: DesiredStore = {
    name: "NozCo",
    currencyCode: "brl",
    salesChannelId: "sc_1",
    regionId: "reg_br",
    locationId: "sloc_1",
    pricesIncludeTaxes: true,
  }
  const configured: ExistingStore = {
    id: "store_1",
    name: "NozCo",
    default_sales_channel_id: "sc_1",
    default_region_id: "reg_br",
    default_location_id: "sloc_1",
    supported_currencies: [{ currency_code: "brl", is_default: true }],
  }

  it("returns null when the store is already configured", () => {
    expect(planStoreUpdate(configured, desired, true)).toBeNull()
  })

  it("configures Medusa's boot-time default store (EUR, default channel)", () => {
    const fresh: ExistingStore = {
      id: "store_1",
      name: "Medusa Store",
      default_sales_channel_id: "sc_default",
      default_region_id: null,
      default_location_id: null,
      supported_currencies: [{ currency_code: "eur", is_default: true }],
    }

    expect(planStoreUpdate(fresh, desired, undefined)).toEqual(buildStoreData(desired))
  })

  it("updates when only the tax-inclusive preference is missing or wrong", () => {
    expect(planStoreUpdate(configured, desired, undefined)).not.toBeNull()
    expect(planStoreUpdate(configured, desired, false)).not.toBeNull()
  })

  it("updates when other currencies are still supported", () => {
    const extra = {
      ...configured,
      supported_currencies: [
        { currency_code: "brl", is_default: true },
        { currency_code: "usd", is_default: false },
      ],
    }

    expect(planStoreUpdate(extra, desired, true)?.supported_currencies).toEqual([
      { currency_code: "brl", is_default: true, is_tax_inclusive: true },
    ])
  })

  it("updates when a default points elsewhere", () => {
    expect(
      planStoreUpdate({ ...configured, default_location_id: "sloc_x" }, desired, true),
    ).toEqual(expect.objectContaining({ default_location_id: "sloc_1" }))
  })
})
