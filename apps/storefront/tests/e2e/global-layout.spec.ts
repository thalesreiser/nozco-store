import { gzipSync } from "node:zlib"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

// The fictional store details come from the webServer env in playwright.config.ts. Their absence is
// covered by tests/components/layout.test.ts.
const desktop = { viewport: { width: 1280, height: 800 } }
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }

async function openHome(page: Page) {
  await page.goto("/")
  await page.waitForFunction(() => "__vue_app__" in (document.querySelector("#__nuxt") ?? {}))
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations).toEqual([])
}

async function controlsBelowTouchSize(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("a, button, input:not([type=checkbox]), label:has(input)")]
      .filter((element) => {
        if (element.classList.contains("sr-only")) return false
        const style = getComputedStyle(element)
        return style.display !== "none" && (element as HTMLElement).offsetParent !== null
      })
      .map((element) => {
        const { width, height } = element.getBoundingClientRect()
        return { text: element.textContent.trim(), width, height }
      })
      .filter(({ width, height }) => width < 44 || height < 44),
  )
}

for (const [name, use] of Object.entries({ desktop, mobile })) {
  test.describe(`global layout on ${name}`, () => {
    test.use(use)

    test("has no axe violations and fits the screen", async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text())
      })

      await openHome(page)
      await page.getByRole("contentinfo").scrollIntoViewIfNeeded()
      await expect(page.locator("form[data-hydrated=true]")).toBeVisible()

      await expectNoAxeViolations(page)
      expect(errors).toEqual([])
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })

    test("gives every control a 44 px touch target", async ({ page }) => {
      await openHome(page)

      expect(await controlsBelowTouchSize(page)).toEqual([])
    })

    test("loads nothing from another origin", async ({ page, baseURL }) => {
      const external: string[] = []
      page.on("request", (request) => {
        if (!request.url().startsWith(baseURL!)) external.push(request.url())
      })

      await openHome(page)
      await page.getByRole("contentinfo").scrollIntoViewIfNeeded()
      await expect(page.locator("form[data-hydrated=true]")).toBeVisible()

      expect(external).toEqual([])
    })

    test("shows the store details and links to WhatsApp and the FAQ", async ({ page }) => {
      await openHome(page)
      const footer = page.getByRole("contentinfo")

      await expect(footer.getByText("CNPJ: 00.000.000/0000-00")).toBeVisible()
      await expect(footer.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
        "href",
        "https://wa.me/5500000000000",
      )
      await expect(footer.getByRole("link", { name: "[Perguntas frequentes]" })).toBeVisible()
    })

    test("newsletter sends nothing, even when valid", async ({ page }) => {
      await openHome(page)
      const form = page.locator("form[data-hydrated=true]")
      await page.getByRole("contentinfo").scrollIntoViewIfNeeded()
      await expect(form).toBeVisible()
      const requests: string[] = []
      // Nuxt checks its own build version in the background; that request carries no form data.
      page.on("request", (request) => {
        if (!new URL(request.url()).pathname.startsWith("/_nuxt/")) requests.push(request.url())
      })

      await form.getByRole("button").click()
      await expect(form.getByRole("textbox")).toBeFocused()
      await expectNoAxeViolations(page)

      await form.getByRole("textbox").fill("pessoa@example.com")
      await form.getByRole("button").click()
      await expect(form.getByRole("checkbox")).toBeFocused()
      await form.getByRole("checkbox").check()
      await form.getByRole("button").click()

      await expect(form.getByRole("status")).toContainText("Nenhum dado foi enviado")
      expect(requests).toEqual([])
      expect(page.url()).not.toContain("example.com")
    })
  })
}

test("keeps the initial JS within the 170 KB gzip budget", async ({ browser, request }) => {
  // Without scripts the page shows what the server sent. Blocking JS only: a rel="prefetch" chunk is
  // fetched when the browser is idle and does not count.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto("/")
  const urls = await page
    .locator('script[src], link[rel="modulepreload"]')
    .evaluateAll((tags) => tags.map((tag) => tag.getAttribute("src") ?? tag.getAttribute("href")))
  await context.close()
  const files = new Set(urls.filter((url): url is string => Boolean(url?.endsWith(".js"))))
  expect(files.size).toBeGreaterThan(0)

  let bytes = 0
  for (const file of files) {
    bytes += gzipSync(await (await request.get(file)).body()).length
  }

  expect(bytes / 1024).toBeLessThan(170)
})

test.describe("desktop header", () => {
  test.use(desktop)

  test("shows the menu, search and cart, without the mobile menu", async ({ page }) => {
    await openHome(page)
    const header = page.getByRole("banner")

    await expect(header.getByRole("navigation", { name: "Principal" })).toBeVisible()
    await expect(header.getByRole("link", { name: "Rastreio" })).toBeVisible()
    await expect(header.getByRole("searchbox", { name: "Buscar produtos" })).toBeVisible()
    await expect(header.getByRole("link", { name: "Carrinho, nenhum item" })).toBeVisible()
    await expect(header.getByRole("button", { name: "Abrir menu" })).toBeHidden()
  })

  test("reaches the content through the skip link", async ({ page }) => {
    await openHome(page)

    await page.keyboard.press("Tab")
    const skip = page.getByRole("link", { name: "Pular para o conteúdo" })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press("Enter")
    await expect(page.locator("#conteudo")).toBeFocused()
  })
})

test.describe("mobile menu", () => {
  test.use(mobile)

  async function openMenu(page: Page) {
    await openHome(page)
    await page.getByRole("button", { name: "Abrir menu" }).click()
    return page.getByRole("dialog")
  }

  test("is the only way to the menu links, and has no axe violations when open", async ({
    page,
  }) => {
    await openHome(page)
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden()

    const dialog = await openMenu(page)

    await expect(dialog.getByRole("link", { name: "Rastreio" })).toBeVisible()
    await expect(dialog.getByRole("searchbox", { name: "Buscar produtos" })).toBeVisible()
    await expect(dialog.getByRole("link", { name: /WhatsApp/ })).toBeVisible()
    await expectNoAxeViolations(page)
    expect(await controlsBelowTouchSize(page)).toEqual([])
  })

  test("closes with Escape and gives focus back to its button", async ({ page }) => {
    const dialog = await openMenu(page)
    await expect(dialog).toBeVisible()

    await page.keyboard.press("Escape")

    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: "Abrir menu" })).toBeFocused()
  })

  test("keeps keyboard focus inside while open", async ({ page }) => {
    const dialog = await openMenu(page)

    for (let press = 0; press < 12; press += 1) {
      await page.keyboard.press("Tab")
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      )
    }
  })

  test("closes with its close button", async ({ page }) => {
    const dialog = await openMenu(page)

    await dialog.getByRole("button", { name: "Fechar menu" }).click()

    await expect(dialog).toBeHidden()
  })

  test("closes when a link is followed", async ({ page }) => {
    const dialog = await openMenu(page)

    await dialog.getByRole("link", { name: "Rastreio" }).click()

    await expect(dialog).toBeHidden()
  })
})
