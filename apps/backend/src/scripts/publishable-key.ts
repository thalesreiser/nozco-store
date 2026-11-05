import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { STORE_SETUP } from "../lib/store-setup/constants"
import { type ExistingApiKey, findActivePublishableKey } from "../lib/store-setup/plan"
import { queryList } from "../lib/store-setup/query"

/**
 * Prints the publishable key created by the store setup, for the storefront's
 * `NUXT_PUBLIC_PUBLISHABLE_KEY`. Read-only. A publishable key is public by design: it only scopes
 * Store API requests to the `loja-online` sales channel.
 *
 * Usage: `pnpm --filter @nozco/backend store:publishable-key`
 */
export default async function printPublishableKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const { title } = STORE_SETUP.publishableApiKey

  const keys = await queryList<ExistingApiKey & { token: string }>(container, {
    entity: "api_key",
    fields: ["id", "title", "type", "revoked_at", "token"],
    filters: { type: "publishable", title },
  })
  const key = findActivePublishableKey(keys, title)
  if (!key) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `No active publishable key "${title}". Run \`pnpm db:migrate\` first.`,
    )
  }

  logger.info(`NUXT_PUBLIC_PUBLISHABLE_KEY=${key.token}`)
}
