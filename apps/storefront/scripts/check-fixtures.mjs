// Runs after every `nuxt build`. Fails unless the fictional fixtures are out of the build, or, for a
// mock build, in it. The second case proves this check can find them at all.
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Same value as FIXTURE_MARKER in app/data/mock/fixtures.ts; tests/unit/data-source.test.ts compares them.
const MARKER = "nozco-fictional-fixture-7f3a9c"
const OUTPUT = ".output"
// Same value as GALLERY_MARKER in shared/gallery.ts; tests/unit/gallery.test.ts compares them.
const GALLERY_MARKER = "nozco-component-gallery-2c81e4"

// nuxt.config.ts reads .env too, so both must agree on the selected source.
if (existsSync(".env")) process.loadEnvFile(".env")
const expectFixtures = process.env.NUXT_PUBLIC_DATA_SOURCE === "mock"
const expectGallery = ["development", "preview"].includes(process.env.NUXT_PUBLIC_APP_ENV ?? "")

if (!existsSync(OUTPUT)) {
  console.error(`check-fixtures: ${OUTPUT} not found. Run nuxt build first.`)
  process.exit(1)
}

const files = readdirSync(OUTPUT, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name))
const hits = files.filter((file) => readFileSync(file).includes(MARKER))
const galleryHits = files.filter((file) => readFileSync(file).includes(GALLERY_MARKER))

if (expectGallery ? galleryHits.length === 0 : galleryHits.length > 0) {
  const found = galleryHits.length > 0 ? `found in:\n${galleryHits.join("\n")}` : "not found"
  console.error(
    `check-fixtures: expected the component gallery ${expectGallery ? "in" : "out of"} the build, ${found}`,
  )
  process.exit(1)
}

if (expectFixtures ? hits.length === 0 : hits.length > 0) {
  const found = hits.length > 0 ? `found in:\n${hits.join("\n")}` : "not found"
  console.error(
    `check-fixtures: expected fixtures ${expectFixtures ? "in" : "out of"} the build, ${found}`,
  )
  process.exit(1)
}

console.error(
  `check-fixtures: ok, ${files.length} files scanned, fixture marker ${expectFixtures ? `in ${hits.length} file(s) (mock build)` : "absent"}, gallery marker ${expectGallery ? `in ${galleryHits.length} file(s)` : "absent"}.`,
)
