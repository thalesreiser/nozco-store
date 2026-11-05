import type { ExecArgs } from "@medusajs/framework/types"
import { setupStore } from "../lib/store-setup/setup-store"

/**
 * Store configuration (BE-01.2). `medusa db:migrate` runs it once per environment and records it;
 * a failed run is retried on the next migrate. The setup itself is idempotent, so running it again
 * (`pnpm exec medusa exec ./src/migration-scripts/setup-brazil-store.ts`) never duplicates anything.
 */
export default async function setupBrazilStore({ container }: ExecArgs) {
  await setupStore(container)
}
