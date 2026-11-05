/**
 * Configurable values of the store setup (BE-01.2). Everything the setup creates is identified by the
 * names below, so changing a name here after the setup ran in an environment creates a new record
 * instead of renaming the old one.
 *
 * No business-sensitive data goes here: the repository is public. Fields marked PLACEHOLDER are
 * pending a decision by Thales and are edited later in the admin, not in code.
 */

export const STORE_SETUP = {
  store: {
    name: "NozCo",
  },
  /** ISO 4217, lower case as Medusa stores it. */
  currencyCode: "brl",
  /**
   * PLACEHOLDER: catalogue prices are treated as already including taxes. With no tax rates this
   * charges exactly the listed price. Thales and the accountant confirm it (see the PR "Pending" list).
   */
  pricesIncludeTaxes: true,
  region: {
    name: "Brasil",
    /** ISO 3166-1 alpha-2, lower case as Medusa stores it. */
    countryCode: "br",
    /**
     * Medusa's built-in tax provider. No tax rate is created: the region only needs a tax region so
     * rates can be added later. Real rates are a business decision (see the PR "Pending" list).
     */
    taxProviderId: "tp_system",
  },
  salesChannel: {
    name: "loja-online",
    description: "Storefront sales channel (Nuxt)",
  },
  publishableApiKey: {
    title: "loja-online storefront",
  },
  stockLocation: {
    /** PLACEHOLDER: generic name until the real warehouse is defined. */
    name: "Armazém principal",
    /**
     * PLACEHOLDER: only the country is set. The real shipping origin is pending in Q-10; it is
     * business data, so it is filled in the admin (Settings > Locations & Shipping), never committed.
     */
    address: {
      countryCode: "BR",
      address1: "",
    },
  },
} as const

export type StoreSetupConfig = typeof STORE_SETUP
