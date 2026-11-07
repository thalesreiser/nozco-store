import { gzipSync } from "node:zlib"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

// Runs on the mock source: the CI job loads NUXT_PUBLIC_DATA_SOURCE=mock from .env.example.
const desktop = { viewport: { width: 1280, height: 800 } }
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const narrow = { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }

const LISTING = "/categoria/estampas-exemplo"

async function open(page: Page, path = LISTING) {
  await page.goto(path)
  await page.waitForFunction(() => "__vue_app__" in (document.querySelector("#__nuxt") ?? {}))
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations).toEqual([])
}

const firstName = (page: Page) => page.locator("main article a").first()

for (const [name, use] of Object.entries({ desktop, mobile, narrow })) {
  test.describe(`listing on ${name}`, () => {
    test.use(use)

    test("has no axe violations, errors or overflow, and asks no other origin", async ({
      page,
      baseURL,
    }) => {
      const problems: string[] = []
      page.on("pageerror", (error) => problems.push(error.message))
      page.on("console", (message) => {
        if (message.type() === "error") problems.push(message.text())
      })
      page.on("request", (request) => {
        if (!request.url().startsWith(baseURL!)) problems.push(request.url())
      })

      await open(page)
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Estampas exemplo")
      await expect(page.getByRole("status").first()).toContainText("24")

      await expectNoAxeViolations(page)
      expect(problems).toEqual([])
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBe(0)
    })

    test("keeps every control at 44 px and every card's content inside it", async ({ page }) => {
      await open(page)

      const small = await page.evaluate(() =>
        [...document.querySelectorAll("main button, main select, nav[aria-label=Páginas] a")]
          .filter((element) => (element as HTMLElement).offsetParent !== null)
          .map((element) => {
            const { width, height } = element.getBoundingClientRect()
            return { text: element.textContent.trim(), width, height }
          })
          .filter(({ width, height }) => width < 44 || height < 44),
      )
      expect(small).toEqual([])

      const spilled = await page.evaluate(() =>
        [...document.querySelectorAll("main article")].flatMap((card) => {
          const { left, right } = card.getBoundingClientRect()
          return [...card.querySelectorAll("a, span, button, svg")]
            .filter((element) => {
              const box = element.getBoundingClientRect()
              return box.width > 0 && (box.left < left - 1 || box.right > right + 1)
            })
            .map((element) => element.textContent.trim())
        }),
      )
      expect(spilled).toEqual([])

      // The stretched link makes the whole photo and text block its target.
      const link = await firstName(page).evaluate((element) => {
        const stretched = getComputedStyle(element, "::after")
        return { width: parseFloat(stretched.width), height: parseFloat(stretched.height) }
      })
      expect(link.width).toBeGreaterThanOrEqual(44)
      expect(link.height).toBeGreaterThanOrEqual(44)
    })
  })
}

for (const [name, use] of Object.entries({ mobile, narrow })) {
  test.describe(`cards on ${name}`, () => {
    test.use(use)

    test("shows two per row, with the name above the price", async ({ page }) => {
      await open(page)
      const cards = page.locator("main article")
      const first = (await cards.nth(0).boundingBox())!
      const second = (await cards.nth(1).boundingBox())!
      const third = (await cards.nth(2).boundingBox())!

      expect(second.y).toBe(first.y)
      expect(second.x).toBeGreaterThan(first.x)
      expect(third.y).toBeGreaterThan(first.y)

      const nameBox = (await firstName(page).boundingBox())!
      const priceBox = (await cards.nth(0).getByText("R$", { exact: false }).first().boundingBox())!
      expect(priceBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height - 1)
    })
  })
}

test.describe("desktop filters", () => {
  test.use(desktop)

  test("sit above the products, and filter from a menu that returns the focus", async ({
    page,
  }) => {
    await open(page)
    const trigger = page.getByRole("button", { name: /^Tamanho/ })
    const grid = (await page.locator("main article").first().boundingBox())!
    expect((await trigger.boundingBox())!.y).toBeLessThan(grid.y)
    await expect(page.getByRole("button", { name: "[Filtrar]" })).toBeHidden()
    await expect(page.locator("main article").nth(3)).toBeVisible()
    const fourth = (await page.locator("main article").nth(3).boundingBox())!
    expect(fourth.y).toBe(grid.y)

    await trigger.click()
    const options = page.getByRole("radio")
    await expect(options.first()).toBeVisible()
    await expectNoAxeViolations(page)
    await page.getByRole("radio", { name: "GG" }).click()
    await expect(page).toHaveURL(/tamanho=GG/)

    await page.keyboard.press("Escape")
    await expect(page.getByRole("radio")).toHaveCount(0)
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText("GG")
  })

  test("colour shows its name, from the facets", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: /^Cor/ }).click()

    await expect(page.getByRole("radio", { name: "Azul" })).toBeVisible()
    await expect(page.getByRole("radio", { name: "Verde" })).toBeVisible()
  })

  test("filters by price, refuses a bad range and clears", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: /^\[Preço\]/ }).click()
    const min = page.getByLabel("[Mínimo (R$)]")
    const max = page.getByLabel("[Máximo (R$)]")
    await expect(min).toBeVisible()

    await min.fill("90")
    await max.fill("80")
    await page.getByRole("button", { name: "[Aplicar]" }).click()
    await expect(page.getByText("[O mínimo não pode passar do máximo.]")).toBeVisible()
    await expect(max).toBeFocused()
    expect(page.url()).not.toContain("preco_")
    await expectNoAxeViolations(page)

    await max.fill("")
    await page.getByRole("button", { name: "[Aplicar]" }).click()
    await expect(page).toHaveURL(/preco_min=9000/)
    await expect(page.getByRole("status").first()).toContainText("[4 produtos]")

    await page.keyboard.press("Escape")
    await page.getByRole("button", { name: "[Limpar filtros]" }).click()
    await expect(page).not.toHaveURL(/preco_min/)
    await expect(page.getByRole("status").first()).toContainText("[24 produtos]")
  })
})

test.describe("mobile drawer", () => {
  test.use(mobile)

  test("traps the focus, closes with Escape and returns the focus", async ({ page }) => {
    await open(page)
    const trigger = page.getByRole("button", { name: "[Filtrar]" })
    await trigger.focus()
    await page.keyboard.press("Enter")
    const drawer = page.getByRole("dialog")
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole("button", { name: "Fechar filtros" })).toBeFocused()
    await expectNoAxeViolations(page)

    for (let press = 0; press < 12; press++) {
      await page.keyboard.press("Tab")
      expect(await drawer.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      )
    }

    await page.keyboard.press("Escape")
    await expect(drawer).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test("filters behind the drawer and shows the results when closed", async ({ page }) => {
    await open(page)
    await page.getByRole("button", { name: "[Filtrar]" }).click()
    const drawer = page.getByRole("dialog")
    await drawer.getByRole("radio", { name: "Verde" }).click()
    await expect(page).toHaveURL(/cor=Verde/)
    await expect(drawer).toBeVisible()

    await drawer.getByRole("button", { name: "[Ver resultados]" }).click()
    await expect(drawer).toBeHidden()
    await expect(page.getByRole("status").first()).toContainText("[12 produtos]")
    await expect(page.getByRole("button", { name: /\[Filtrar\] \(1\)/ })).toBeVisible()
  })
})

test.describe("state in the URL", () => {
  test.use(desktop)

  test("restores filters, order and page from a link", async ({ page }) => {
    await open(page, `${LISTING}?tamanho=M&ordem=price_desc`)

    await expect(page.getByRole("button", { name: "Tamanho: M" })).toBeVisible()
    await expect(page.getByRole("combobox", { name: "Ordenar produtos" })).toHaveValue("price_desc")
    await expect(firstName(page)).toHaveText("Estampa Fictícia 24")
  })

  test("sorts through the URL, back to the first page", async ({ page }) => {
    await open(page, `${LISTING}?pagina=2`)
    await page.getByRole("combobox", { name: "Ordenar produtos" }).selectOption("price_desc")

    await expect(page).toHaveURL(/ordem=price_desc/)
    await expect(page).not.toHaveURL(/pagina/)
    await expect(firstName(page)).toHaveText("Estampa Fictícia 24")
  })

  test("paginates with real links and moves the focus to the title", async ({ page }) => {
    await open(page)
    const pages = page.getByRole("navigation", { name: "Páginas" })
    await pages.getByRole("link", { name: "Próxima página" }).click()

    await expect(page).toHaveURL(/pagina=2/)
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
    await expect(page.locator("main article")).toHaveCount(4)
    await expect(firstName(page)).toHaveText("Estampa Fictícia 21")

    await page.goBack()
    await expect(page.locator("main article")).toHaveCount(20)
  })

  test("shows the page past the end as empty, with a way back", async ({ page }) => {
    await open(page, `${LISTING}?pagina=9`)

    await page.getByRole("link", { name: "[Ir para a primeira página]" }).click()
    await expect(page.locator("main article")).toHaveCount(20)
  })
})

test.describe("empty states", () => {
  test.use(desktop)

  test("offers to clear filters that left nothing", async ({ page }) => {
    await open(page, `${LISTING}?cor=Inexistente`)

    await expect(page.getByRole("heading", { name: "[Nenhum produto encontrado]" })).toBeVisible()
    await expectNoAxeViolations(page)
    await page.getByRole("main").getByRole("button", { name: "[Limpar filtros]" }).last().click()
    await expect(page.locator("main article")).toHaveCount(20)
  })

  test("answers 404 for a category with no products, inside the layout", async ({ page }) => {
    const response = await page.goto("/categoria/nao-existe")

    expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: "[Nada por aqui ainda]" })).toBeVisible()
    await expect(page.getByRole("contentinfo")).toBeVisible()
    await expectNoAxeViolations(page)
  })

  test("opens a collection too", async ({ page }) => {
    await open(page, "/colecao/colecao-exemplo")

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Coleção exemplo")
    await expect(page.locator("main article")).toHaveCount(2)
  })
})

test("keeps the listing's initial JS within the 170 KB gzip budget", async ({
  browser,
  request,
}) => {
  // Same measure as the home in tests/e2e/global-layout.spec.ts: blocking JS only.
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(LISTING)
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
