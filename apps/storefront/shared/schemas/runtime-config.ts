import { z } from "zod"
import { DATA_SOURCES, isMockAllowedIn } from "../data-source"

export const publicRuntimeConfigSchema = z
  .object({
    apiUrl: z.url({ protocol: /^https?$/ }),
    publishableKey: z.string().min(1),
    appEnv: z.enum(["development", "preview", "production"]),
    dataSource: z.enum(DATA_SOURCES),
  })
  .refine((config) => config.dataSource !== "mock" || isMockAllowedIn(config.appEnv), {
    path: ["dataSource"],
    message: "the mock source is refused in production",
  })

export type PublicRuntimeConfig = z.infer<typeof publicRuntimeConfigSchema>

/** Returns the parsed config, or throws an error naming every invalid field. */
export function parsePublicRuntimeConfig(config: unknown): PublicRuntimeConfig {
  const result = publicRuntimeConfigSchema.safeParse(config)
  if (result.success) return result.data

  const problems = result.error.issues.map(
    (issue) => `public.${issue.path.join(".")}: ${issue.message}`,
  )
  throw new Error(`Invalid runtimeConfig:\n${problems.join("\n")}`)
}
