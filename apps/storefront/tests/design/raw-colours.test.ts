import { globSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { ESLint, Linter } from "eslint"
import vueParser from "vue-eslint-parser"
import { describe, expect, it } from "vitest"
import { findRawColours, noRawColors } from "../../eslint/no-raw-colors.js"

const root = fileURLToPath(new URL("../..", import.meta.url))

function lint(code: string, filename = "Example.vue") {
  return new Linter({ configType: "flat" })
    .verify(
      code,
      [
        {
          files: ["**/*.vue"],
          languageOptions: { parser: vueParser, sourceType: "module" },
          plugins: { nozco: { rules: { "no-raw-colors": noRawColors } } },
          rules: { "nozco/no-raw-colors": "error" },
        },
      ],
      { filename },
    )
    .map(({ ruleId, line }) => ({ ruleId, line }))
}

describe("no-raw-colors", () => {
  it.each([
    ["an arbitrary hex class", `<template><p class="bg-[#fff]" /></template>`],
    ["an inline style", `<template><p style="color: #111111" /></template>`],
    ["a named colour in a style", `<template><p style="border: 1px solid red" /></template>`],
    ["an svg attribute", `<template><path fill="#0d0d0d" stroke="black" /></template>`],
    ["a colour function", `<template><p :style="{ color: 'rgb(0 0 0)' }" /></template>`],
    ["a palette utility", `<template><p class="hover:bg-red-500/50" /></template>`],
    ["white and black utilities", `<template><p class="text-white bg-black" /></template>`],
    [
      "a script literal",
      `<script setup>const c = "oklch(0.5 0 0)"</script><template><p /></template>`,
    ],
    ["a style block", `<template><p /></template><style>p { color: #abc }</style>`],
  ])("reports %s", (_name, code) => {
    expect(lint(code)[0]?.ruleId).toBe("nozco/no-raw-colors")
  })

  it("points at the line of the colour", () => {
    expect(lint(`<template>\n  <p />\n  <p class="text-[#123456]" />\n</template>`)).toEqual([
      { ruleId: "nozco/no-raw-colors", line: 3 },
    ])
  })

  it.each([
    ["semantic classes", `<template><p class="bg-primary text-primary-foreground" /></template>`],
    ["opacity on a token", `<template><p class="hover:bg-primary/90 border-border" /></template>`],
    ["in-page links", `<template><a href="#cafe">x</a><NuxtLink to="#abc" /></template>`],
    ["html entities", `<template><p>&#123;</p></template>`],
    ["keywords", `<template><p class="bg-transparent text-current" /></template>`],
    ["words near colours", `<template><p class="to-do text-red-carpet">redo</p></template>`],
    [
      "script comments",
      `<script setup>// see #123\nconst a = 1</script><template><p /></template>`,
    ],
  ])("accepts %s", (_name, code) => {
    expect(lint(code)).toEqual([])
  })

  it("is switched on for components, pages and layouts by the real config", async () => {
    const eslint = new ESLint({ cwd: root })
    for (const file of [
      "app/components/ui/x.vue",
      "app/pages/x.vue",
      "app/layouts/x.vue",
      "app/app.vue",
    ]) {
      const config = (await eslint.calculateConfigForFile(file)) as {
        rules: Record<string, unknown>
      }
      expect([file, config.rules["nozco/no-raw-colors"]]).toEqual([file, [2]])
    }
    // Loading the real config imports all of typescript-eslint.
  }, 60_000)
})

// ESLint does not read CSS files, so they are checked here.
describe("stylesheets", () => {
  it("have raw colours only in tokens.css", () => {
    const files = globSync("app/**/*.css", { cwd: root }).map((file) => file.replaceAll("\\", "/"))
    expect(files).toContain("app/assets/css/main.css")

    const found = files
      .filter((file) => file !== "app/assets/css/tokens.css")
      .flatMap((file) =>
        findRawColours(readFileSync(`${root}/${file}`, "utf8")).map(
          ({ value }) => `${file}: ${value}`,
        ),
      )
    expect(found).toEqual([])
  })
})
