import { builtinModules } from "node:module"
import { describe, expect, it } from "vitest"

// Nitro's Cloudflare preset has no Node runtime behind these files. This guards the source; the bundle
// for that preset is checked by hand in the PR, and the real runtime in FE-10.1.
const sources = import.meta.glob<string>(["../../server/**/*.ts", "../../shared/**/*.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
})

const NODE_MODULES = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]))

describe("server code", () => {
  it("finds the files it checks", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(10)
  })

  it.each(Object.entries(sources))("%s imports no Node module and no Node global", (_, source) => {
    const imports = [
      ...source.matchAll(/(?:from\s+|import\s*\(\s*|require\s*\(\s*)["']([^"']+)["']/g),
    ]
    expect(imports.map((match) => match[1]).filter((name) => NODE_MODULES.has(name ?? ""))).toEqual(
      [],
    )
    expect(source).not.toMatch(/\b(?:process\.|Buffer\.|__dirname|__filename|setImmediate\()/)
    expect(source).not.toMatch(/event\.node\b/)
  })
})
