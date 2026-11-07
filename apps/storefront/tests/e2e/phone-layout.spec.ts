import { spawn } from "node:child_process"
import type { ChildProcess } from "node:child_process"
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const desktop = { viewport: { width: 1280, height: 800 } }
const mobile = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }

async function openHome(page: Page, url = "/") {
  await page.goto(url)
  await page.waitForFunction(() => "__vue_app__" in (document.querySelector("#__nuxt") ?? {}))
}

async function expectNoAxeViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  expect(violations).toEqual([])
}

const pageOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

const whatsAppButton = (page: Page) =>
  page.getByRole("complementary", { name: "Atendimento" }).getByRole("link", { name: /WhatsApp/ })

/** The tests must not depend on how much content the page has, so they give it length to scroll. */
async function makePageLong(page: Page) {
  await page.locator("main").evaluate((main) => {
    main.style.minHeight = "3000px"
    main.style.position = "relative"
  })
}

test.describe("sticky header row on a phone", () => {
  test.use(mobile)

  const row = (page: Page) => page.locator("header > div")

  test("keeps only the 63 px logo row on screen", async ({ page }) => {
    await openHome(page)
    await makePageLong(page)
    const announcement = page.getByText("AVISO DA LOJA")
    await expect(announcement).toBeInViewport()

    await page.evaluate(() => globalThis.scrollTo(0, 1000))

    await expect(announcement).not.toBeInViewport()
    expect(await row(page).boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 63 })
  })

  test("truncates a long announcement on one line", async ({ page }) => {
    await openHome(page)
    const announcement = page.locator("header p")
    const oneLine = await announcement.evaluate((element) => {
      element.textContent = "FRETE"
      return element.getBoundingClientRect().height
    })

    await announcement.evaluate((element) => {
      element.textContent = "FRETE GRÁTIS PARA TODO O BRASIL ".repeat(10)
    })

    expect((await announcement.boundingBox())!.height).toBe(oneLine)
    expect(await pageOverflow(page)).toBe(0)
  })

  test("fits a 320 px screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 })
    await openHome(page)

    expect(await pageOverflow(page)).toBe(0)
    await expect(page.getByRole("link", { name: /^Carrinho/ })).toBeInViewport({ ratio: 1 })
  })

  test("keeps a focused element and an anchor target clear of the row", async ({ page }) => {
    await openHome(page)
    await makePageLong(page)
    await page.locator("main").evaluate((main) => {
      const probe = document.createElement("a")
      probe.id = "alvo"
      probe.href = "#alvo"
      probe.textContent = "alvo"
      probe.style.position = "absolute"
      probe.style.top = "1500px"
      main.append(probe)
    })
    const probe = page.locator("#alvo")

    await page.evaluate(() => globalThis.scrollTo(0, 2500))
    await probe.focus()
    expect((await probe.boundingBox())!.y).toBeGreaterThanOrEqual(63)

    await page.evaluate(() => {
      globalThis.scrollTo(0, 2500)
      location.hash = "#alvo"
    })
    await expect(probe).toBeInViewport()
    expect((await probe.boundingBox())!.y).toBeGreaterThanOrEqual(63)
  })
})

test.describe("search icon on a phone", () => {
  test.use(mobile)

  const icon = (page: Page) => page.getByRole("button", { name: "Abrir busca" })
  const field = (page: Page) => page.getByRole("banner").getByRole("searchbox")

  test("opens on one tap with the field focused, and has no axe violations", async ({ page }) => {
    await openHome(page)
    await expect(field(page)).toBeHidden()
    await expect(icon(page)).toHaveAttribute("aria-expanded", "false")

    await icon(page).tap()

    await expect(field(page)).toBeFocused()
    await expect(field(page)).toHaveAccessibleName("Buscar produtos")
    await expect(page.getByRole("button", { name: "Fechar busca" })).toHaveAttribute(
      "aria-expanded",
      "true",
    )
    await expectNoAxeViolations(page)
  })

  test("closes on Escape and gives focus back to the icon", async ({ page }) => {
    await openHome(page)
    await icon(page).tap()
    await expect(field(page)).toBeFocused()

    await page.keyboard.press("Escape")

    await expect(field(page)).toBeHidden()
    await expect(icon(page)).toBeFocused()
  })

  test("submits a plain GET to /busca?q=", async ({ page }) => {
    await openHome(page)
    await icon(page).tap()
    await field(page).fill("camiseta preta")

    const [request] = await Promise.all([
      page.waitForRequest((candidate) => new URL(candidate.url()).pathname === "/busca"),
      page.keyboard.press("Enter"),
    ])

    expect(request.method()).toBe("GET")
    expect(new URL(request.url()).search).toBe("?q=camiseta+preta")
    expect(request.isNavigationRequest()).toBe(true)
  })
})

test.describe("search on desktop", () => {
  test.use(desktop)

  test("has no icon, because the field is already visible", async ({ page }) => {
    await openHome(page)

    await expect(page.getByRole("button", { name: "Abrir busca" })).toBeHidden()
    await expect(page.getByRole("banner").getByRole("searchbox")).toBeVisible()
  })
})

for (const [name, use] of Object.entries({ desktop, mobile })) {
  test.describe(`WhatsApp button on ${name}`, () => {
    test.use(use)

    test("stays in the bottom corner, opens a new tab and passes axe", async ({ page }) => {
      await openHome(page)
      await makePageLong(page)
      const button = whatsAppButton(page)

      for (const top of [0, 1000]) {
        await page.evaluate((y) => globalThis.scrollTo(0, y), top)
        const box = (await button.boundingBox())!
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.x + box.width).toBe(use.viewport.width - 16)
        expect(box.y + box.height).toBe(use.viewport.height - 16)
      }
      await expect(button).toHaveAttribute("href", "https://wa.me/5500000000000")
      await expect(button).toHaveAttribute("target", "_blank")
      await expect(button).toHaveAttribute("rel", "noopener")
      await expect(button).toHaveAccessibleName(/WhatsApp.*abre em nova aba/)
      await expectNoAxeViolations(page)
    })
  })
}

test.describe("stacking of the WhatsApp button", () => {
  test.use(mobile)

  const isCovered = (page: Page) =>
    page.evaluate(() => {
      const { x, y, width, height } = document.querySelector("aside a")!.getBoundingClientRect()
      const element = document.elementFromPoint(x + width / 2, y + height / 2)
      return element?.closest("aside") === null
    })

  test("stays under the sticky row and the mobile menu", async ({ page }) => {
    await openHome(page)
    const zIndex = (selector: string) =>
      page.locator(selector).evaluate((element) => Number(getComputedStyle(element).zIndex))
    expect(await zIndex("aside")).toBeLessThan(await zIndex("header > div"))

    await page.getByRole("button", { name: "Abrir menu" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    expect(await isCovered(page)).toBe(true)
  })

  test("stays under the filter drawer", async ({ page }) => {
    await openHome(page, "/categoria/estampas-exemplo")
    await page.getByRole("button", { name: "[Filtrar]" }).click()
    await expect(page.getByRole("dialog")).toBeVisible()

    expect(await isCovered(page)).toBe(true)
  })

  test("is clear of the cart link", async ({ page }) => {
    await openHome(page)
    const cart = (await page.getByRole("link", { name: /^Carrinho/ }).boundingBox())!
    const button = (await whatsAppButton(page).boundingBox())!

    expect(cart.y + cart.height).toBeLessThan(button.y)
  })
})

// These start their own server from the same build: the store details come from its environment.
test.describe("server environment", () => {
  const legalData = {
    NUXT_PUBLIC_LEGAL_NAME: "[Razão social fictícia]",
    NUXT_PUBLIC_CNPJ: "00.000.000/0000-00",
    NUXT_PUBLIC_LEGAL_ADDRESS: "[Rua de Exemplo, 100]",
    NUXT_PUBLIC_CONTACT_EMAIL: "contato@example.com",
  }
  const servers: ChildProcess[] = []

  function start(port: number, env: NodeJS.ProcessEnv) {
    const server = spawn(process.execPath, [".output/server/index.mjs"], {
      env: {
        ...process.env,
        NUXT_PUBLIC_API_URL: "http://localhost:9000",
        NUXT_PUBLIC_PUBLISHABLE_KEY: "pk_e2e_placeholder",
        PORT: String(port),
        ...env,
      },
    })
    servers.push(server)
    let output = ""
    const exit = new Promise<string>((resolve) => {
      server.on("exit", (code) => {
        resolve(`exit ${String(code)}`)
      })
    })
    const started = new Promise<string>((resolve) => {
      const collect = (chunk: Buffer) => {
        output += chunk.toString()
        if (output.includes("Listening")) resolve("listening")
      }
      server.stdout.on("data", collect)
      server.stderr.on("data", collect)
    })
    return { result: Promise.race([started, exit]), output: () => output }
  }

  test.afterEach(() => {
    for (const server of servers.splice(0)) server.kill()
  })

  test("a production start fails without the legal data, and names it", async () => {
    const { result, output } = start(3101, {
      NUXT_PUBLIC_APP_ENV: "production",
      NUXT_PUBLIC_DATA_SOURCE: "api",
    })

    expect(await result).toBe("exit 1")
    for (const variable of Object.keys(legalData)) expect(output()).toContain(variable)
  })

  test("a production start works with the legal data", async () => {
    const { result } = start(3102, {
      ...legalData,
      NUXT_PUBLIC_APP_ENV: "production",
      NUXT_PUBLIC_DATA_SOURCE: "api",
    })

    expect(await result).toBe("listening")
  })

  test("preview needs no legal data, and has no WhatsApp button without a number", async ({
    page,
  }) => {
    const { result } = start(3103, {
      NUXT_PUBLIC_APP_ENV: "preview",
      NUXT_PUBLIC_DATA_SOURCE: process.env.NUXT_PUBLIC_DATA_SOURCE ?? "api",
    })
    expect(await result).toBe("listening")
    await page.setViewportSize(mobile.viewport)

    await openHome(page, "http://localhost:3103/")

    await expect(page.getByRole("banner")).toBeVisible()
    await expect(page.getByRole("link", { name: /WhatsApp/ })).toHaveCount(0)
    await expect(page.getByRole("complementary")).toHaveCount(0)
  })
})
