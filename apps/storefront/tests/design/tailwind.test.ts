import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname } from "node:path"
import { compile } from "tailwindcss"
import { describe, expect, it } from "vitest"
import { cn, semanticThemeNames } from "../../app/lib/utils"

const tokensUrl = new URL("../../app/assets/css/tokens.css", import.meta.url)
const tokens = readFileSync(tokensUrl, "utf8")
const require = createRequire(import.meta.url)

/** The CSS Tailwind generates for `candidates` with the real default theme and the token file. */
async function generate(candidates: string[]): Promise<string> {
  const compiler = await compile(
    `@import "tailwindcss/theme.css";\n${tokens}\n@tailwind utilities;`,
    {
      loadStylesheet: (id, base) => {
        const path = require.resolve(id)
        return Promise.resolve({
          path,
          base: base || dirname(path),
          content: readFileSync(path, "utf8"),
        })
      },
    },
  )
  return compiler.build(candidates)
}

describe("Tailwind theme", () => {
  it.each([
    "bg-background",
    "text-muted-foreground",
    "text-error",
    "font-display",
    "font-sans",
    "font-heavy",
    "text-display",
    "px-page",
    "min-h-touch",
    "rounded-control",
    "rounded-md",
    "shadow-overlay",
    "tracking-label",
    "p-4",
  ])("generates %s", async (candidate) => {
    expect(await generate([candidate])).toContain(`.${candidate}`)
  })

  it.each([
    "bg-red-500",
    "text-white",
    "bg-black",
    "border-neutral-200",
    "text-sm",
    "font-medium",
    "font-mono",
    "shadow-md",
  ])("generates nothing for the default %s", async (candidate) => {
    expect(await generate([candidate])).not.toContain(`.${candidate}`)
  })

  it("makes a colour utility follow the ground", async () => {
    expect(await generate(["bg-primary"])).toContain("var(--primary)")
  })
})

describe("cn", () => {
  it("knows every semantic name of the token file", () => {
    const names = (prefix: string) =>
      [...tokens.matchAll(new RegExp(`^\\s*--${prefix}-([a-z]+):`, "gm"))].map((m) => m[1]!)

    expect(semanticThemeNames.text).toEqual(names("text"))
    expect(semanticThemeNames["font-weight"]).toEqual(names("font-weight"))
    expect(semanticThemeNames.tracking).toEqual(names("tracking"))
    expect(semanticThemeNames.spacing).toEqual(names("spacing"))
    expect(semanticThemeNames.shadow).toEqual(names("shadow"))
    expect(semanticThemeNames.radius).toEqual(
      names("radius").filter((name) => !["sm", "md", "lg", "xl"].includes(name)),
    )
  })

  it("keeps a text size next to a text colour, and a weight next to a family", () => {
    expect(cn("text-lead text-foreground")).toBe("text-lead text-foreground")
    expect(cn("font-display font-heavy")).toBe("font-display font-heavy")
  })

  it("lets the later class win inside one group", () => {
    expect(cn("text-lead", "text-note")).toBe("text-note")
    expect(cn("px-page", "px-grid")).toBe("px-grid")
    expect(cn("rounded-control", "rounded-surface")).toBe("rounded-surface")
    expect(cn("font-regular", "font-heavy")).toBe("font-heavy")
  })
})
