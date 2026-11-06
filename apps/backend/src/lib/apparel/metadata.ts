import { apparelMetadataSchema } from "@nozco/shared-types"
import { invalid } from "./amounts"

/** The error names the fields only: metadata values do not belong in logs. */
export function assertApparelMetadata(metadata: unknown) {
  const parsed = apparelMetadataSchema.safeParse(metadata ?? {})
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")
    throw invalid(`Invalid product metadata: ${fields}`)
  }
}
