import Medusa from "@medusajs/js-sdk"

export type MedusaClient = Medusa

export function createMedusaClient(config: { apiUrl: string; publishableKey: string }): Medusa {
  return new Medusa({
    baseUrl: config.apiUrl,
    publishableKey: config.publishableKey,
    // The customer token stays in an httpOnly cookie behind server routes (FE-02.2). The SDK must never
    // keep one in the browser.
    auth: { type: "jwt", jwtTokenStorageMethod: "nostore" },
  })
}
