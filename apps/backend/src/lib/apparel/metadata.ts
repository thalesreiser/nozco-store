import { apparelMetadataSchema, invalidColorHexKeys } from "@nozco/shared-types"
import { invalid } from "./amounts"

/** The metadata keys that fail the garment schema or hold an invalid colour value. */
export function invalidApparelMetadataKeys(metadata: unknown): string[] {
  const parsed = apparelMetadataSchema.safeParse(metadata ?? {})
  const garmentKeys = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."))
  return [...garmentKeys, ...invalidColorHexKeys(metadata)]
}

/** The error names the fields only: metadata values do not belong in logs. */
export function assertApparelMetadata(metadata: unknown) {
  const keys = invalidApparelMetadataKeys(metadata)
  if (keys.length > 0) {
    throw invalid(`Invalid product metadata: ${keys.join(", ")}`)
  }
}
