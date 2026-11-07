import { renderSuspended } from "@nuxt/test-utils/runtime"
import { fireEvent, screen, waitFor } from "@testing-library/vue"
import { beforeEach, describe, expect, it } from "vitest"
import BrandMark from "~/components/base/BrandMark.vue"
import NewsletterForm from "~/components/layout/NewsletterForm.vue"
import SiteFooter from "~/components/layout/SiteFooter.vue"
import SiteHeader from "~/components/layout/SiteHeader.vue"
import type { StoreInfo } from "~/composables/useStoreInfo"
import { resetDataSources } from "~/data"

const absent: StoreInfo = {
  whatsAppUrl: null,
  legalName: "",
  cnpj: "",
  legalAddress: "",
  contactEmail: "",
  socialLinks: [],
  paymentMethods: [],
}
const complete: StoreInfo = {
  whatsAppUrl: "https://wa.me/5500000000000",
  legalName: "[Razão social fictícia]",
  cnpj: "00.000.000/0000-00",
  legalAddress: "[Rua de Exemplo, 100]",
  contactEmail: "contato@example.com",
  socialLinks: [{ name: "Rede", url: "https://example.com/rede" }],
  paymentMethods: ["[Pix]"],
}

function renderHeader(cartCount: number | null) {
  return renderSuspended(SiteHeader, {
    props: {
      menuLinks: [{ label: "Camisetas", to: "/categoria/c" }],
      cartCount,
      whatsAppUrl: null,
    },
  })
}

describe("brand mark", () => {
  it("renders the text wordmark", async () => {
    await renderSuspended(BrandMark)
    expect(screen.getByText("NOZCO")).toBeTruthy()
  })
})

describe("site header", () => {
  it("names the cart with its number of items", async () => {
    await renderHeader(2)
    expect(screen.getByRole("link", { name: "Carrinho, 2 itens" })).toBeTruthy()
  })

  it("says the cart is empty", async () => {
    await renderHeader(0)
    expect(screen.getByRole("link", { name: "Carrinho, nenhum item" })).toBeTruthy()
  })

  it("claims no number while the count is unknown", async () => {
    await renderHeader(null)
    const cart = screen.getByRole("link", { name: "Carrinho" })
    expect(cart.querySelector(".invisible")).toBeTruthy()
  })

  it("links to the categories and to tracking", async () => {
    await renderHeader(0)
    expect(screen.getByRole("link", { name: "Camisetas" }).getAttribute("href")).toBe(
      "/categoria/c",
    )
    expect(screen.getByRole("link", { name: "Rastreio" }).getAttribute("href")).toBe("/rastreio")
  })

  it("sends a search to the results route as a plain GET", async () => {
    await renderHeader(0)
    const form = screen.getAllByRole("search")[0]!
    expect(form.getAttribute("action")).toBe("/busca")
    expect(form.getAttribute("method")).toBe("get")
    expect(form.querySelector("input")?.getAttribute("name")).toBe("q")
  })
})

describe("site footer", () => {
  it("hides every element whose value is absent", async () => {
    await renderSuspended(SiteFooter, { props: { storeInfo: absent } })

    expect(screen.queryByText(/WhatsApp/)).toBeNull()
    expect(screen.queryByText("[Redes sociais]")).toBeNull()
    expect(screen.queryByText("[Formas de pagamento]")).toBeNull()
    expect(screen.queryByTestId("legal-data")).toBeNull()
  })

  it("always links to the FAQ (RF-20)", async () => {
    await renderSuspended(SiteFooter, { props: { storeInfo: absent } })

    expect(screen.getByRole("link", { name: "[Perguntas frequentes]" })).toBeTruthy()
  })

  it("shows the legal data, payment methods and links it receives (RST-01, RF-20)", async () => {
    await renderSuspended(SiteFooter, { props: { storeInfo: complete } })

    expect(screen.getByText("[Razão social fictícia]")).toBeTruthy()
    expect(screen.getByText("CNPJ: 00.000.000/0000-00")).toBeTruthy()
    expect(screen.getByText("[Rua de Exemplo, 100]")).toBeTruthy()
    expect(screen.getByRole("link", { name: "contato@example.com" })).toBeTruthy()
    expect(screen.getByText("[Pix]")).toBeTruthy()
    const whatsApp = screen.getByRole("link", { name: /WhatsApp/ })
    expect(whatsApp.getAttribute("href")).toBe("https://wa.me/5500000000000")
    expect(whatsApp.getAttribute("rel")).toContain("noopener")
    expect(screen.getByRole("link", { name: /Rede/ }).getAttribute("target")).toBe("_blank")
  })
})

describe("newsletter form", () => {
  async function fill(email: string, consent: boolean) {
    const { container } = await renderSuspended(NewsletterForm)
    await fireEvent.update(screen.getByLabelText("[E-mail]"), email)
    if (consent) await fireEvent.click(screen.getByRole("checkbox"))
    await fireEvent.submit(container.querySelector("form")!)
  }

  it("has no field a native submit could send", async () => {
    const { container } = await renderSuspended(NewsletterForm)
    expect(container.querySelectorAll("input[name]")).toHaveLength(0)
  })

  it("starts with the consent unchecked", async () => {
    await renderSuspended(NewsletterForm)
    expect(screen.getByRole<HTMLInputElement>("checkbox").checked).toBe(false)
  })

  it("refuses an invalid e-mail", async () => {
    await fill("x", true)
    await waitFor(() => expect(screen.getByText("[Informe um e-mail válido.]")).toBeTruthy())
    expect(screen.queryByText(/Nenhum dado foi enviado/)).toBeNull()
  })

  it("refuses without consent (RF-19)", async () => {
    await fill("pessoa@example.com", false)
    await waitFor(() =>
      expect(screen.getByText("[Marque o consentimento para continuar.]")).toBeTruthy(),
    )
    expect(screen.queryByText(/Nenhum dado foi enviado/)).toBeNull()
  })

  // That no request leaves the page is proved in the browser: tests/e2e/global-layout.spec.ts.
  it("says nothing was sent when valid", async () => {
    await fill("pessoa@example.com", true)
    await waitFor(() => expect(screen.getByText(/Nenhum dado foi enviado/)).toBeTruthy())
  })
})

describe("cart count", () => {
  beforeEach(() => {
    useRuntimeConfig().public.dataSource = "mock"
    resetDataSources()
    useState("cart-count").value = null
  })

  it("is zero without a cart", async () => {
    const { count, refresh } = useCartCount()
    await refresh()
    expect(count.value).toBe(0)
  })

  it("adds up the quantities", async () => {
    const { addItem } = useCart()
    await addItem({ variant_id: "variant_mock_camiseta-ficticia-alfa_M_Preto", quantity: 2 })
    const { count, refresh } = useCartCount()
    await refresh()
    expect(count.value).toBe(2)
  })

  it("is unknown when the source fails", async () => {
    useRuntimeConfig().public.dataSource = "api"
    resetDataSources()
    const { count, refresh } = useCartCount()
    await refresh()
    expect(count.value).toBeNull()
  })
})
