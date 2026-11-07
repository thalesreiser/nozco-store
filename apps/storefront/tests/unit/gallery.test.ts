import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { GALLERY_MARKER, isGalleryAllowedIn } from "#shared/gallery"

describe("component gallery", () => {
  it.each([
    ["development", true],
    ["preview", true],
    ["production", false],
    ["staging", false],
    [undefined, false],
  ])("for environment %s, allowed is %s", (appEnv, allowed) => {
    expect(isGalleryAllowedIn(appEnv)).toBe(allowed)
  })

  it("uses the marker the build check looks for", () => {
    const script = readFileSync("scripts/check-fixtures.mjs", "utf8")

    expect(script).toContain(`"${GALLERY_MARKER}"`)
  })
})
