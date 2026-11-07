/**
 * Amount in the smallest currency unit (centavos), always an integer. Medusa v2 itself returns major
 * units (20.5 is R$ 20,50), so whatever reads the Store API converts at that boundary.
 */
export type Cents = number

export interface Money {
  amount: Cents
  currencyCode: "brl"
}

export type * from "./store.js"
export * from "./apparel.js"
export * from "./catalog.js"
export * from "./cart.js"
export * from "./content.js"
export * from "./cpf.js"
export * from "./privacy.js"
