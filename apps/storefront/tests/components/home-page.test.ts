import { renderSuspended } from "@nuxt/test-utils/runtime"
import { screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"
import HomePage from "~/pages/index.vue"

describe("home page", () => {
  it("shows the store name and the pt-BR placeholder text", async () => {
    await renderSuspended(HomePage)

    expect(screen.getByRole("heading", { level: 1, name: "NozCo" })).toBeTruthy()
    expect(screen.getByText("Nossa loja está em construção.")).toBeTruthy()
  })
})
