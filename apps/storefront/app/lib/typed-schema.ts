import type { TypedSchema } from "vee-validate"
import type { z } from "zod"

/** Connects a shared Zod schema to VeeValidate. @vee-validate/zod only supports Zod 3. */
export function zodTypedSchema<TValues, TOutput>(
  schema: z.ZodType<TOutput>,
): TypedSchema<TValues, TOutput> {
  return {
    __type: "VVTypedSchema",
    parse(values) {
      const result = schema.safeParse(values)
      if (result.success) return Promise.resolve({ value: result.data, errors: [] })
      return Promise.resolve({
        errors: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          errors: [issue.message],
        })),
      })
    },
  }
}
