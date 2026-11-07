import { renderSuspended } from "@nuxt/test-utils/runtime"
import { fireEvent, screen } from "@testing-library/vue"
import { describe, expect, it } from "vitest"
import BasePrice from "~/components/base/BasePrice.vue"
import ErrorState from "~/components/base/ErrorState.vue"
import QuantityStepper from "~/components/base/QuantityStepper.vue"
import StockBadge from "~/components/base/StockBadge.vue"
import ColourSwatch from "~/components/catalog/ColourSwatch.vue"
import ProductCard from "~/components/catalog/ProductCard.vue"
import SizeSelector from "~/components/catalog/SizeSelector.vue"
import { buttonVariants } from "~/components/ui/button"
import { formatBrl } from "~/lib/money"

const text = (value: string | null) => (value ?? "").replace(/\s+/g, " ").trim()

describe("formatBrl", () => {
  it.each([
    [0, "R$ 0,00"],
    [2050, "R$ 20,50"],
    [123456, "R$ 1.234,56"],
  ])("formats %i cents", (cents, expected) => {
    expect(formatBrl(cents).replace(/\s/g, " ")).toBe(expected)
  })

  it("refuses major units instead of quoting the wrong price", () => {
    expect(() => formatBrl(20.5)).toThrow(RangeError)
  })
})

describe("BasePrice", () => {
  it("names a previous price for screen readers and strikes it through", async () => {
    const { container } = await renderSuspended(BasePrice, {
      props: { amount: 12990, previous: true },
    })

    expect(text(container.textContent)).toBe("Preço anterior: R$ 129,90")
    expect(text(container.querySelector("s")!.textContent)).toBe("R$ 129,90")
  })
})

describe("Button", () => {
  it.each(["default", "sm", "icon"] as const)("gives size %s the touch target", (size) => {
    expect(buttonVariants({ size })).toMatch(/\b(h|size)-touch\b/)
  })

  it("makes the large size taller than the touch target", () => {
    expect(buttonVariants({ size: "lg" })).toContain("h-12")
  })
})

describe("QuantityStepper", () => {
  const props = { label: "Quantidade", modelValue: 2, min: 1, max: 3 }

  it("steps up and down", async () => {
    const view = await renderSuspended(QuantityStepper, { props })

    await fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade" }))
    await fireEvent.click(screen.getByRole("button", { name: "Diminuir quantidade" }))

    expect(view.emitted("update:modelValue")).toEqual([[3], [1]])
  })

  it("stops at the limits and keeps the button focusable", async () => {
    const view = await renderSuspended(QuantityStepper, {
      props: { ...props, modelValue: 3 },
    })
    const increase = screen.getByRole("button", { name: "Aumentar quantidade" })

    await fireEvent.click(increase)

    expect(view.emitted("update:modelValue")).toBeUndefined()
    expect(increase.getAttribute("aria-disabled")).toBe("true")
    expect(increase.hasAttribute("disabled")).toBe(false)
  })

  it("does nothing when disabled", async () => {
    const view = await renderSuspended(QuantityStepper, {
      props: { ...props, disabled: true },
    })

    await fireEvent.click(screen.getByRole("button", { name: "Aumentar quantidade" }))

    expect(view.emitted("update:modelValue")).toBeUndefined()
  })

  it("announces its error", async () => {
    await renderSuspended(QuantityStepper, { props: { ...props, error: "Erro de teste" } })

    expect(screen.getByRole("alert").textContent).toContain("Erro de teste")
  })
})

describe("StockBadge", () => {
  it.each([
    ["in", "[EM ESTOQUE]"],
    ["low", "Últimas"],
    ["out", "[ESGOTADO]"],
  ] as const)("writes status %s as text", async (status, expected) => {
    await renderSuspended(StockBadge, { props: { status } })

    expect(screen.getByText(expected)).toBeTruthy()
  })
})

describe("ErrorState", () => {
  it("announces itself and shows the action", async () => {
    await renderSuspended(ErrorState, {
      props: { title: "Erro de teste" },
      slots: { default: () => "Ação" },
    })

    expect(screen.getByRole("alert").textContent).toContain("Ação")
    expect(screen.getByRole("heading", { level: 2, name: "Erro de teste" })).toBeTruthy()
  })
})

describe("SizeSelector", () => {
  const options = [
    { value: "a", label: "Um" },
    { value: "b", label: "Dois", available: false },
  ]

  it("keeps an unavailable size visible, named and not selectable", async () => {
    const view = await renderSuspended(SizeSelector, { props: { label: "Tamanho", options } })
    const unavailable = screen.getByRole("radio", { name: /Dois.*indisponível/ })

    await fireEvent.click(unavailable)

    expect(unavailable.hasAttribute("disabled")).toBe(true)
    expect(view.emitted("update:modelValue")).toBeUndefined()
  })

  it("emits the chosen size and links the group to its error", async () => {
    const view = await renderSuspended(SizeSelector, {
      props: { label: "Tamanho", options, error: "Erro de teste" },
    })

    await fireEvent.click(screen.getByRole("radio", { name: "Um" }))

    expect(view.emitted("update:modelValue")).toEqual([["a"]])
    const group = screen.getByRole("radiogroup", { name: "Tamanho" })
    expect(group.getAttribute("aria-invalid")).toBe("true")
    expect(document.getElementById(group.getAttribute("aria-describedby")!)?.textContent).toContain(
      "Erro de teste",
    )
  })
})

describe("ColourSwatch", () => {
  it("always writes the colour name, with or without a chip", async () => {
    const { container } = await renderSuspended(ColourSwatch, {
      props: {
        label: "Cor",
        options: [
          { value: "a", label: "Com amostra", fill: "var(--foreground)" },
          { value: "b", label: "Sem amostra" },
        ],
      },
    })

    expect(screen.getByRole("radio", { name: "Com amostra" })).toBeTruthy()
    expect(screen.getByRole("radio", { name: "Sem amostra" })).toBeTruthy()
    expect(container.querySelectorAll("[role=radio] [style]")).toHaveLength(1)
  })
})

describe("ProductCard", () => {
  const props = { name: "Estampa de teste", to: "/produto/teste", price: 8990 }

  it("shows a linked name and price, and emits buy", async () => {
    const view = await renderSuspended(ProductCard, { props })

    await fireEvent.click(screen.getByRole("button", { name: "Comprar Estampa de teste" }))

    expect(view.emitted("buy")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Estampa de teste" }).getAttribute("href")).toBe(
      "/produto/teste",
    )
    expect(text(view.container.textContent)).toContain("R$ 89,90")
  })

  it("disables buying when out of stock, and that replaces any other tag", async () => {
    await renderSuspended(ProductCard, { props: { ...props, stock: "out", badge: "Novidade" } })

    expect(screen.getByRole("button").hasAttribute("disabled")).toBe(true)
    expect(screen.getByText("[ESGOTADO]")).toBeTruthy()
    expect(screen.queryByText("Novidade")).toBeNull()
  })

  it("shows the previous price and note only when given", async () => {
    const view = await renderSuspended(ProductCard, { props })
    expect(view.container.querySelector("s")).toBeNull()

    await view.rerender({ compareAt: 12990, note: "Nota de teste" })

    expect(text(view.container.querySelector("s")!.textContent)).toBe("R$ 129,90")
    expect(screen.getByText("Nota de teste")).toBeTruthy()
  })
})
