import { DataSourceError } from "../errors"
import type { DataSource } from "../source"

/** Takes the place of `./index` through the `#mock-source` alias in builds without fixtures. */
export function createMockSource(): DataSource {
  throw new DataSourceError(
    "source_unavailable",
    "This build has no mock source. Build with NUXT_PUBLIC_DATA_SOURCE=mock outside production.",
  )
}
