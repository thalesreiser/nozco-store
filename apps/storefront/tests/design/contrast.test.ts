import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(
  new URL("../../app/assets/css/tokens.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "")

function block(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (!match?.[1]) throw new Error(`No "${selector}" block in tokens.css`)
  const declarations = [...match[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)]
  return Object.fromEntries(declarations.map((m): [string, string] => [m[1]!, m[2]!.trim()]))
}

const palette = block(":root")
const grounds = {
  store: block(":root,\n.ground-store"),
  brand: block(".ground-brand"),
}

function resolve(ground: Record<string, string>, name: string): string {
  const value = ground[`--${name}`] ?? palette[`--${name}`]
  if (!value) throw new Error(`Unknown token --${name}`)
  const reference = /^var\(--([\w-]+)\)$/.exec(value)
  return reference ? resolve(ground, reference[1]!) : value
}

function channels(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`Colour tokens must be #rrggbb, got "${hex}"`)
  return [parseInt(match[1]!, 16), parseInt(match[2]!, 16), parseInt(match[3]!, 16)]
}

// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const c = value / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

const NORMAL_TEXT = 4.5
const LARGE_TEXT_OR_UI = 3

type Pair = { text: string; on: string; min: number }
const pair = (text: string, on: string, min = NORMAL_TEXT): Pair => ({ text, on, min })

// Text on the surfaces it is allowed to sit on, evaluated on both grounds.
const TEXT_PAIRS: Pair[] = [
  pair("foreground", "background"),
  pair("foreground", "muted"),
  pair("muted-foreground", "background"),
  pair("muted-foreground", "muted"),
  pair("muted-foreground", "card"),
  pair("card-foreground", "card"),
  pair("popover-foreground", "popover"),
  pair("primary-foreground", "primary"),
  pair("primary", "background"),
  pair("primary", "muted"),
  pair("secondary-foreground", "secondary"),
  pair("accent-foreground", "accent"),
  pair("destructive-foreground", "destructive"),
  pair("destructive", "background"),
  pair("link", "background"),
  pair("link-hover", "background"),
  pair("error", "background"),
  pair("error", "error-surface"),
  pair("success", "background"),
  pair("success", "success-surface"),
]

// WCAG 1.4.11: field outlines and the focus ring need 3:1 against what is next to them.
const UI_PAIRS: Pair[] = [
  pair("input", "background", LARGE_TEXT_OR_UI),
  pair("ring", "background", LARGE_TEXT_OR_UI),
]

// Colours nothing must read against: decorative dividers. A new colour token fails the test below
// until it is in a pair or here.
const DECORATIVE = new Set(["border"])

describe("WCAG contrast computation", () => {
  it("matches published values", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5)
    expect(contrast("#767676", "#ffffff")).toBeCloseTo(4.54, 2)
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2)
    expect(contrast("#949494", "#ffffff")).toBeCloseTo(3.03, 2)
  })

  it("is the same in both directions", () => {
    expect(contrast("#595959", "#f1f1f1")).toBe(contrast("#f1f1f1", "#595959"))
  })

  it("refuses a format it cannot compute instead of skipping it", () => {
    expect(() => contrast("oklch(1 0 0)", "#ffffff")).toThrow("#rrggbb")
    expect(() => contrast("#fff", "#ffffff")).toThrow("#rrggbb")
  })
})

describe.each(Object.entries(grounds))("%s ground", (_name, ground) => {
  it.each([...TEXT_PAIRS, ...UI_PAIRS])("$text on $on reaches $min:1", ({ text, on, min }) => {
    const ratio = contrast(resolve(ground, text), resolve(ground, on))
    expect(ratio).toBeGreaterThanOrEqual(min)
  })

  it("defines only grey colours: the palette has no accent", () => {
    for (const name of Object.keys(ground)) {
      const [r, g, b] = channels(resolve(ground, name.slice(2)))
      expect([name, g, b]).toEqual([name, r, r])
    }
  })
})

describe("token declarations", () => {
  const colourTokens = [...css.matchAll(/--color-([\w-]+):\s*var\(--\1\)/g)].map((m) => m[1]!)

  it("gives both grounds the same names, so nothing leaks from one to the other", () => {
    expect(Object.keys(grounds.brand).sort()).toEqual(Object.keys(grounds.store).sort())
  })

  it("exposes every semantic colour to Tailwind", () => {
    const declared = Object.keys(grounds.store).map((name) => name.slice(2))
    expect(colourTokens.sort()).toEqual(declared.sort())
  })

  it("checks every colour token: each one is in a pair or declared decorative", () => {
    const covered = new Set([...TEXT_PAIRS, ...UI_PAIRS].flatMap(({ text, on }) => [text, on]))
    const unchecked = colourTokens.filter((name) => !covered.has(name) && !DECORATIVE.has(name))
    expect(unchecked).toEqual([])
  })

  it("has a pair for every *-foreground token with its own surface", () => {
    const missing = colourTokens
      .filter((name) => name.endsWith("-foreground"))
      .filter(
        (name) =>
          !TEXT_PAIRS.some((p) => p.text === name && p.on === name.replace("-foreground", "")),
      )
    expect(missing).toEqual([])
  })

  it("has no card outline or offset shadow token", () => {
    expect(css).not.toMatch(/--[\w-]*card[\w-]*(?:outline|shadow)/)
    expect(css).not.toMatch(/--[\w-]*(?:outline|shadow)[\w-]*card/)
    // A shadow without blur is the hard offset style that ADR 005 rejects.
    for (const [, x, y, blur] of css.matchAll(/--shadow-[\w-]+:\s*(\S+)\s+(\S+)\s+(\S+)/g)) {
      expect([x, y, parseFloat(blur!)]).not.toContain(0)
    }
  })
})
