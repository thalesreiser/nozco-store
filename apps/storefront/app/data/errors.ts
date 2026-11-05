export type DataSourceErrorCode =
  /** The api source has no such call yet; the message names the task that adds it. */
  | "not_implemented"
  /** The selected source cannot run in this build or environment. */
  | "source_unavailable"
  | "not_found"
  | "insufficient_stock"

export class DataSourceError extends Error {
  override readonly name = "DataSourceError"

  constructor(
    readonly code: DataSourceErrorCode,
    message: string,
  ) {
    super(message)
  }
}
