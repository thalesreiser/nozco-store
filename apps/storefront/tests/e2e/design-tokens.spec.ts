import { expect, test } from "@playwright/test"

test.describe("design tokens", () => {
  test("restricts fonts to the store's own origin in the CSP", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"]

    expect(csp).toMatch(/font-src 'self'(;|$)/)
  })

  test("loads every font from the store itself, in the weights in use", async ({
    page,
    baseURL,
  }) => {
    const fontRequests: string[] = []
    const externalRequests: string[] = []
    page.on("request", (request) => {
      if (request.resourceType() === "font") fontRequests.push(request.url())
      if (!request.url().startsWith(baseURL!)) externalRequests.push(request.url())
    })
    const errors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })

    await page.goto("/")

    const loaded = await page.evaluate(async () => {
      const specs = [
        '900 16px "Big Shoulders Display"',
        '400 16px "Archivo"',
        '600 16px "Archivo"',
        '700 16px "Archivo"',
      ]
      const faces = await Promise.all(specs.map((spec) => document.fonts.load(spec, "NozCo ção")))
      return faces.map((face) => face.length)
    })

    expect(loaded).toEqual([1, 1, 1, 1])
    expect(fontRequests.length).toBe(4)
    for (const url of fontRequests) expect(url).toMatch(/\.woff2$/)
    expect(externalRequests).toEqual([])
    expect(errors).toEqual([])
  })

  test("applies the fonts and the store ground", async ({ page }) => {
    await page.goto("/")

    const styles = await page.evaluate(() => {
      const body = getComputedStyle(document.body)
      const title = getComputedStyle(document.querySelector("h1")!)
      return {
        background: body.backgroundColor,
        text: body.color,
        bodyFont: body.fontFamily,
        titleFont: title.fontFamily,
        titleWeight: title.fontWeight,
      }
    })

    expect(styles.background).toBe("rgb(255, 255, 255)")
    expect(styles.text).toBe("rgb(17, 17, 17)")
    expect(styles.bodyFont).toContain("Archivo")
    expect(styles.titleFont).toContain("Big Shoulders Display")
    expect(styles.titleWeight).toBe("900")
  })

  test("switches the semantic colours inside the brand ground", async ({ page }) => {
    await page.goto("/")

    const brand = await page.evaluate(() => {
      const element = document.createElement("div")
      element.className = "ground-brand"
      element.style.borderColor = "var(--primary)"
      document.body.append(element)
      const style = getComputedStyle(element)
      return {
        background: style.backgroundColor,
        text: style.color,
        primary: style.borderTopColor,
      }
    })

    expect(brand.background).toBe("rgb(13, 13, 13)")
    expect(brand.text).toBe("rgb(255, 255, 255)")
    expect(brand.primary).toBe("rgb(255, 255, 255)")
  })
})
