import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

// CI builds with apps/storefront/.env.example (development), which includes the gallery. Its absence
// from a production build is proved by scripts/check-fixtures.mjs in the CI build job.
const components = [
  "button",
  "price",
  "skeleton",
  "empty-state",
  "error-state",
  "quantity-stepper",
  "stock-badge",
  "size-selector",
  "colour-swatch",
  "product-card",
  "listing-results",
]
const grounds = ["store", "brand"]

const viewports = [
  { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
  {
    name: "mobile",
    use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  },
]

async function openGallery(page: Page) {
  await page.goto("/_componentes")
  await page.waitForFunction(() => "__vue_app__" in (document.querySelector("#__nuxt") ?? {}))
}

for (const viewport of viewports) {
  test.describe(`component gallery on ${viewport.name}`, () => {
    test.use(viewport.use)

    test("has no axe violations in any component on either ground", async ({ page }) => {
      await openGallery(page)

      for (const ground of grounds) {
        for (const component of components) {
          const selector = `[data-ground="${ground}"] [data-component="${component}"]`
          await expect(page.locator(selector)).toBeVisible()
          const { violations } = await new AxeBuilder({ page }).include(selector).analyze()
          expect([ground, component, violations]).toEqual([ground, component, []])
        }
      }
      const { violations } = await new AxeBuilder({ page }).analyze()
      expect(violations).toEqual([])
    })

    test("loads without errors and fits the screen", async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text())
      })

      await openGallery(page)

      expect(errors).toEqual([])
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })

    test("gives every control a 44 px touch target", async ({ page }) => {
      await openGallery(page)

      const tooSmall = await page.evaluate(() =>
        [...document.querySelectorAll("button, [role=radio]")]
          .map((element) => {
            const { width, height } = element.getBoundingClientRect()
            return { text: element.textContent.trim(), width, height }
          })
          .filter(({ width, height }) => width < 44 || height < 44),
      )

      expect(tooSmall).toEqual([])
    })
  })
}

test.describe("component gallery behaviour", () => {
  test.beforeEach(async ({ page }) => {
    await openGallery(page)
  })

  test("is marked to stay out of search engines", async ({ page }) => {
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/)
  })

  test("shows a visible focus outline on both grounds", async ({ page }) => {
    for (const ground of grounds) {
      const button = page
        .locator(`[data-ground="${ground}"] [data-component="button"] button`)
        .first()
      await button.focus()
      await page.keyboard.press("Shift+Tab")
      await page.keyboard.press("Tab")

      // These retry: the colour transition of a button also animates its outline colour.
      await expect(button).toHaveCSS("outline-style", "solid")
      await expect(button).toHaveCSS("outline-width", "2px")
      await expect(button).toHaveCSS(
        "outline-color",
        ground === "store" ? "rgb(13, 13, 13)" : "rgb(255, 255, 255)",
      )
    }
  })

  test("moves through the sizes with the arrow keys and skips the unavailable one", async ({
    page,
  }) => {
    const group = page.locator('[data-ground="store"] [data-component="size-selector"]')
    const medium = group.getByRole("radio", { name: "[M]" }).first()
    await medium.focus()

    // Held, not pressed: Reka UI checks the item on focus only while an arrow key is down, and an
    // instant press releases it before focus moves. A person's key press lasts longer than that.
    await page.keyboard.down("ArrowRight")

    const extraLarge = group.getByRole("radio", { name: "[GG]" }).first()
    await expect(extraLarge).toBeFocused()
    await expect(extraLarge).toHaveAttribute("aria-checked", "true")
    await page.keyboard.up("ArrowRight")
  })

  test("keeps focus on the stepper button at its limit", async ({ page }) => {
    const increase = page
      .locator('[data-ground="store"] [data-component="quantity-stepper"]')
      .getByRole("button", { name: "Aumentar quantidade" })
      .first()
    await increase.focus()

    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")

    await expect(increase).toBeFocused()
    await expect(increase).toHaveAttribute("aria-disabled", "true")
    await expect(
      page.locator('[data-ground="store"] [data-component="quantity-stepper"] output').first(),
    ).toHaveText("3")
  })
})
