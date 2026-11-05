import { MedusaError } from "@medusajs/framework/utils"

/**
 * Pure decision logic of the store setup. Each function compares what already exists with what the
 * setup wants and returns only the missing work, which is what makes the setup idempotent.
 */

export type ExistingRegion = {
  id: string
  name: string
  currency_code: string
  countries?: ({ iso_2?: string | null } | null)[] | null
}

export type RegionPlan = { action: "create" } | { action: "reuse"; id: string }

/**
 * A country belongs to at most one region in Medusa, so the region is found by country, not by name.
 * A region that already holds the country with another currency is a conflict a person must solve.
 */
export function planRegion(
  regions: ExistingRegion[],
  countryCode: string,
  currencyCode: string,
): RegionPlan {
  const country = countryCode.toLowerCase()
  const region = regions.find((candidate) =>
    candidate.countries?.some((entry) => entry?.iso_2?.toLowerCase() === country),
  )
  if (!region) {
    return { action: "create" }
  }
  if (region.currency_code.toLowerCase() !== currencyCode.toLowerCase()) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      `Region "${region.name}" already contains country "${country}" with currency ` +
        `"${region.currency_code}" instead of "${currencyCode}". Fix it in the admin and rerun.`,
    )
  }
  return { action: "reuse", id: region.id }
}

/** Finds a record by its exact name (sales channels, stock locations). */
export function findByName<T extends { name: string }>(items: T[], name: string): T | undefined {
  return items.find((item) => item.name === name)
}

export type ExistingApiKey = {
  id: string
  title: string
  type: string
  revoked_at?: Date | string | null
}

/** A revoked key with the same title does not count: the storefront cannot use it. */
export function findActivePublishableKey<T extends ExistingApiKey>(
  keys: T[],
  title: string,
): T | undefined {
  return keys.find((key) => key.type === "publishable" && key.title === title && !key.revoked_at)
}

/** Returns the ids to pass as `add` to a link workflow: empty when the link already exists. */
export function idsToLink(
  linked: ({ id: string } | null | undefined)[] | null | undefined,
  wantedId: string,
): string[] {
  return linked?.some((entry) => entry?.id === wantedId) ? [] : [wantedId]
}

/** True when a price preference is missing or disagrees with the wanted tax-inclusive flag. */
export function needsTaxInclusiveUpdate(
  current: { is_tax_inclusive: boolean } | undefined,
  wanted: boolean,
): boolean {
  return current?.is_tax_inclusive !== wanted
}

export type ExistingStore = {
  id: string
  name: string
  default_sales_channel_id?: string | null
  default_region_id?: string | null
  default_location_id?: string | null
  supported_currencies?: ({ currency_code: string; is_default?: boolean | null } | null)[] | null
}

export type DesiredStore = {
  name: string
  currencyCode: string
  salesChannelId: string
  regionId: string
  locationId: string
  pricesIncludeTaxes: boolean
}

export type StoreUpdate = {
  name: string
  supported_currencies: { currency_code: string; is_default: boolean; is_tax_inclusive: boolean }[]
  default_sales_channel_id: string
  default_region_id: string
  default_location_id: string
}

/**
 * Returns the update that brings the store to the desired state, or `null` when nothing changes.
 * The store sells in one currency only, so the currency list is replaced by that currency.
 * `currencyTaxInclusive` is the current price preference of that currency, if any.
 */
export function planStoreUpdate(
  store: ExistingStore,
  desired: DesiredStore,
  currencyTaxInclusive: boolean | undefined,
): StoreUpdate | null {
  const currencies = (store.supported_currencies ?? []).filter((entry) => entry !== null)
  const [currency] = currencies
  const onlyDesiredCurrency =
    currencies.length === 1 &&
    currency?.currency_code.toLowerCase() === desired.currencyCode &&
    currency.is_default === true

  const upToDate =
    store.name === desired.name &&
    store.default_sales_channel_id === desired.salesChannelId &&
    store.default_region_id === desired.regionId &&
    store.default_location_id === desired.locationId &&
    onlyDesiredCurrency &&
    currencyTaxInclusive === desired.pricesIncludeTaxes

  if (upToDate) {
    return null
  }
  return buildStoreData(desired)
}

/** Core create workflows return arrays; the setup always creates exactly one record. */
export function firstCreated<T>(result: T[], what: string): T {
  const [created] = result
  if (!created) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Creating the ${what} returned nothing`,
    )
  }
  return created
}

/** Store fields used both to create a missing store and to update an existing one. */
export function buildStoreData(desired: DesiredStore): StoreUpdate {
  return {
    name: desired.name,
    supported_currencies: [
      {
        currency_code: desired.currencyCode,
        is_default: true,
        is_tax_inclusive: desired.pricesIncludeTaxes,
      },
    ],
    default_sales_channel_id: desired.salesChannelId,
    default_region_id: desired.regionId,
    default_location_id: desired.locationId,
  }
}
