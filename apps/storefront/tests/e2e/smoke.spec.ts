import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

test.describe("home page", () => {
  test("is server-rendered with the placeholder text", async ({ request }) => {
    const response = await request.get("/")

    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain("<h1>NozCo</h1>")
    expect(html).toContain("Nossa loja está em construção.")
    expect(html).toMatch(/<html\s+lang="pt-BR"/)
  })

  test("sends the security headers", async ({ request }) => {
    const headers = (await request.get("/")).headers()

    expect(headers["content-security-policy"]).toBeTruthy()
    expect(headers["x-content-type-options"]).toBe("nosniff")
    expect(headers["access-control-allow-origin"]).toBeUndefined()
  })

  test("hydrates without errors and has no axe violations", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })

    await page.goto("/")

    await expect(page.getByRole("heading", { level: 1, name: "NozCo" })).toBeVisible()
    // Vue sets this when the client bundle mounts, so it fails if the CSP or SRI blocks the bundle.
    await page.waitForFunction(() => "__vue_app__" in (document.querySelector("#__nuxt") ?? {}))
    const { violations } = await new AxeBuilder({ page }).analyze()
    expect(violations).toEqual([])
    expect(errors).toEqual([])
  })
})
