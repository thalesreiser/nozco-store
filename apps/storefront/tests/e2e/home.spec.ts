import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

// CI builds with apps/storefront/.env.example, whose mock source has the content asserted here.
const AMBER = "rgb(242, 176, 30)"
const SILVER = "rgb(201, 206, 214)"

async function openHome(page: Page) {
  await page.goto("/")
  await page.waitForFunction(() => "__vue_app__" in (document.querySelector("#__nuxt") ?? {}))
}

test("the server sends the hero title and every block, in the order of ADR 008", async ({
  request,
}) => {
  const html = await (await request.get("/")).text()

  expect(html.match(/<h1[\s>]/g)).toHaveLength(1)
  const positions = ["[Título da coleção]", "[Frete]", "[Novidades]", "[Coleções]"].map((text) =>
    html.indexOf(text),
  )
  expect(positions.every((position) => position >= 0)).toBe(true)
  expect(positions).toEqual([...positions].sort((a, b) => a - b))
  expect(html).toContain("Camiseta Fictícia Alfa")
  expect(html).toContain("[AVISO DA LOJA")
})

const screens = [
  {
    name: "desktop",
    viewport: { width: 1280, height: 800 },
    columns: 4,
    gutter: "48px",
    title: 104,
  },
  { name: "mobile", viewport: { width: 390, height: 844 }, columns: 2, gutter: "16px", title: 52 },
]

for (const { name, viewport, columns, gutter, title } of screens) {
  test.describe(`home on ${name}`, () => {
    test.use({ viewport })

    test("has no axe violations and fits the screen", async ({ page }) => {
      await openHome(page)

      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations).toEqual([])
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0)
    })

    test("uses the title size and page gutter of ADR 011", async ({ page }) => {
      await openHome(page)

      const size = await page
        .getByRole("heading", { level: 1 })
        .evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
      expect(Math.abs(size - title)).toBeLessThan(1)
      const section = page.getByRole("region", { name: "[Novidades]" })
      await expect(section).toHaveCSS("padding-left", gutter)
    })

    test(`shows ${columns} products per row`, async ({ page }) => {
      await openHome(page)

      const grid = page.getByRole("article").first().locator("..")
      const template = await grid.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      )
      expect(template.split(" ")).toHaveLength(columns)
    })

    test("keeps the accents to the wire, its glow and the two lines of ADR 010", async ({
      page,
    }) => {
      await openHome(page)
      const hero = page.getByRole("region", { name: "[Destaques]" })
      const strip = page.getByRole("list", { name: "[Vantagens]" })

      const wire = hero.locator("svg").first()
      const css = (element: Element, property: string) =>
        getComputedStyle(element).getPropertyValue(property)
      expect(await hero.evaluate(css, "border-top-color")).toBe(AMBER)
      expect(await strip.evaluate(css, "border-bottom-color")).toBe(AMBER)
      expect(await wire.evaluate(css, "color")).toBe(SILVER)
      expect(await wire.getAttribute("aria-hidden")).toBe("true")
      expect(await hero.evaluate(css, "background-image")).toContain("radial-gradient")
    })
  })
}

test.describe("banner carousel", () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test("moves by keyboard, never by itself, and without animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.clock.install()
    await openHome(page)
    const title = page.getByRole("heading", { level: 1 })
    await expect(title).toHaveText("[Título da coleção]")

    await page.clock.fastForward(60_000)
    await expect(title).toHaveText("[Título da coleção]")

    const next = page.getByRole("button", { name: "[Próximo destaque]" })
    await next.focus()
    await page.keyboard.press("Enter")
    await expect(title).toHaveText("[Título da campanha]")
    await expect(next).toBeFocused()
    await expect(page.getByText("2 de 2")).toBeVisible()
    await expect(page.getByRole("link", { name: "[Ver coleção]" })).toBeHidden()

    const hero = page.getByRole("region", { name: "[Destaques]" })
    // The buttons' colour fade on focus and hover is not motion; anything else would be.
    const motion = await hero.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .filter(
          (animation) =>
            !(animation instanceof CSSTransition && animation.transitionProperty.includes("color")),
        )
        .map((animation) => animation.constructor.name),
    )
    expect(motion).toEqual([])
  })
})
