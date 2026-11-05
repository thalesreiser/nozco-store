import { useDataSource } from "~/data"

// Selects the source at the start of every app instance, so a source this build cannot serve fails on
// the first request and not on whichever page reads data first. It also keeps the selection in the
// bundle before any page uses a composable, which is what makes scripts/check-fixtures.mjs meaningful.
export default defineNuxtPlugin(() => {
  useDataSource()
})
