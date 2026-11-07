import { z } from "zod"
import { DATA_SOURCES, isMockAllowedIn } from "../data-source"
import { isSocialLinkList } from "../store-info"

// Nuxt turns a numeric environment variable into a number, so these are read as text first.
const text = z.union([z.string(), z.number()]).transform(String)

export const publicRuntimeConfigSchema = z
  .object({
    apiUrl: z.url({ protocol: /^https?$/ }),
    publishableKey: z.string().min(1),
    appEnv: z.enum(["development", "preview", "production"]),
    dataSource: z.enum(DATA_SOURCES),
    whatsappNumber: text
      .refine((value) => /^(\d{10,15})?$/.test(value), {
        message: "digits only, with the country code",
      })
      .optional(),
    legalName: text.optional(),
    cnpj: text.optional(),
    legalAddress: text.optional(),
    contactEmail: text
      .refine((value) => value === "" || z.email().safeParse(value).success, {
        message: "must be an e-mail address",
      })
      .optional(),
    socialLinks: text
      .refine(isSocialLinkList, {
        message: "must be Name|https://url entries separated by commas",
      })
      .optional(),
    paymentMethods: text.optional(),
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
