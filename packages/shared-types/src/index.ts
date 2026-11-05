/** Amount in the smallest currency unit (centavos), as returned by Medusa. */
export type Cents = number

export interface Money {
  amount: Cents
  currencyCode: "brl"
}
