import { renderSuspended } from "@nuxt/test-utils/runtime"
import { screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"
import { Button } from "~/components/ui/button"

// Proves the shadcn-vue setup: Reka UI primitive, cva variants, cn() and semantic Tailwind classes.
describe("Button", () => {
  it("renders through the Reka UI primitive with semantic classes", async () => {
    await renderSuspended(Button, { slots: { default: () => "Comprar" } })

    expect(screen.getByRole("button", { name: "Comprar" }).className).toContain("bg-primary")
  })

  it("renders another element through as", async () => {
    await renderSuspended(Button, {
      props: { as: "a" },
      attrs: { href: "/" },
      slots: { default: () => "Início" },
    })

    expect(screen.getByRole("link", { name: "Início" })).toBeTruthy()
  })
})
