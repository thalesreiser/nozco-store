import { parsePublicRuntimeConfig } from "#shared/schemas/runtime-config"

// Fails when the server starts, naming the bad variables, instead of at the first request.
export default defineNitroPlugin(() => {
  parsePublicRuntimeConfig(useRuntimeConfig().public)
})
