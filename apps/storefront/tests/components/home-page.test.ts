import type { StoreHomeBanner } from "@nozco/shared-types"
import { renderSuspended } from "@nuxt/test-utils/runtime"
import { fireEvent, screen } from "@testing-library/vue"
import { beforeEach, describe, expect, it } from "vitest"
import AnnouncementBar from "~/components/layout/AnnouncementBar.vue"
import HomeCollections from "~/components/home/HomeCollections.vue"
import HomeHero from "~/components/home/HomeHero.vue"
import HomeNewArrivals from "~/components/home/HomeNewArrivals.vue"
import SiteHeader from "~/components/layout/SiteHeader.vue"
import { resetDataSources } from "~/data"
import { toProductCard } from "~/lib/product-card"
import type { ProductCardData } from "~/lib/product-card"
import HomePage from "~/pages/index.vue"
import { productFixtures } from "~/data/mock/fixtures"

const banner = (id: string, extra: Partial<StoreHomeBanner> = {}): StoreHomeBanner => ({
  id,
  title: `[Banner ${id}]`,
  image_url: "",
  image_alt: "[Texto alternativo]",
  cta_label: null,
  cta_url: null,
  ...extra,
})

const card: ProductCardData = {
  id: "p1",
  name: "Camiseta Fictícia",
  to: "/produto/camiseta-ficticia",
  price: 4990,
  compareAt: null,
  stock: "in",
}

describe("home page on the mock source", () => {
  beforeEach(() => {
    useRuntimeConfig().public.dataSource = "mock"
    resetDataSources()
  })

  it("shows the blocks in the order of ADR 008, with one h1", async () => {
    const { container } = await renderSuspended(HomePage)
    await screen.findByRole("link", { name: "Camiseta Fictícia Alfa" })

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("[Título da coleção]")
    const order = [...container.querySelectorAll("section, ul[aria-label]")].map(
      (block) => block.getAttribute("aria-label") ?? block.getAttribute("aria-labelledby"),
    )
    expect(order).toEqual(["[Destaques]", "[Vantagens]", "home-new-arrivals", "home-collections"])
  })

  it("links the collections, and no category, from the catalog menu", async () => {
    await renderSuspended(HomePage)

    const link = await screen.findByRole("link", { name: "Coleção exemplo" })
    expect(link.getAttribute("href")).toBe("/colecao/colecao-exemplo")
    expect(screen.queryByRole("link", { name: "Camisetas exemplo" })).toBeNull()
  })

  it("promises nothing in the value strip until the brand defines it", async () => {
    await renderSuspended(HomePage)

    const items = screen.getByRole("list", { name: "[Vantagens]" }).querySelectorAll("li")
    expect([...items].map((item) => item.textContent)).toEqual([
      "[Frete]",
      "[Parcelamento]",
      "[Troca]",
      "[Segurança]",
    ])
  })
})

describe("hero", () => {
  it("shows the store name when no banner is published", async () => {
    await renderSuspended(HomeHero, { props: { banners: [] } })

    expect(screen.getByRole("heading", { level: 1, name: "NozCo" })).toBeTruthy()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("has no carousel controls for a single banner", async () => {
    await renderSuspended(HomeHero, { props: { banners: [banner("a")] } })

    expect(screen.getByRole("heading", { level: 1, name: "[Banner a]" })).toBeTruthy()
    expect(screen.queryAllByRole("button")).toHaveLength(0)
    expect(screen.queryByText("1 de 1")).toBeNull()
  })

  it("moves through several banners in both directions, wrapping around", async () => {
    await renderSuspended(HomeHero, { props: { banners: [banner("a"), banner("b")] } })
    const title = () => screen.getByRole("heading", { level: 1 }).textContent

    await fireEvent.click(screen.getByRole("button", { name: "[Próximo destaque]" }))
    expect(title()).toContain("[Banner b]")
    expect(screen.getByText("2 de 2").getAttribute("aria-live")).toBe("polite")

    await fireEvent.click(screen.getByRole("button", { name: "[Próximo destaque]" }))
    expect(title()).toContain("[Banner a]")

    await fireEvent.click(screen.getByRole("button", { name: "[Destaque anterior]" }))
    expect(title()).toContain("[Banner b]")
  })

  it("shows the image with its alt text and the button when the banner has them", async () => {
    const banners = [
      banner("a", {
        image_url: "https://example.com/banner.webp",
        cta_label: "[Ver]",
        cta_url: "/colecao/x",
      }),
    ]
    await renderSuspended(HomeHero, { props: { banners } })

    const image = screen.getByRole("img", { name: "[Texto alternativo]" })
    expect(image.getAttribute("src")).toBe("https://example.com/banner.webp")
    expect(screen.getByRole("link", { name: "[Ver]" }).getAttribute("href")).toBe("/colecao/x")
  })

  it("draws no image and no button when the banner has neither", async () => {
    await renderSuspended(HomeHero, { props: { banners: [banner("a")] } })

    expect(screen.queryByRole("img")).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()
  })
})

describe("new arrivals", () => {
  const props = { cards: [card], pending: false, failed: false, size: 4 }

  it("shows the cards and sends the buy button to the product", async () => {
    const view = await renderSuspended(HomeNewArrivals, { props })

    await fireEvent.click(screen.getByRole("button", { name: "Comprar Camiseta Fictícia" }))
    expect(view.emitted("buy")).toEqual([["/produto/camiseta-ficticia"]])
  })

  it("shows skeletons while loading", async () => {
    await renderSuspended(HomeNewArrivals, { props: { ...props, cards: [], pending: true } })

    expect(screen.getAllByRole("status")).toHaveLength(4)
  })

  it("explains an empty catalog", async () => {
    await renderSuspended(HomeNewArrivals, { props: { ...props, cards: [] } })

    expect(screen.getByRole("heading", { level: 3, name: "[Novidades em breve]" })).toBeTruthy()
  })

  it("offers a retry after a failure", async () => {
    const view = await renderSuspended(HomeNewArrivals, {
      props: { ...props, cards: [], failed: true },
    })

    expect(screen.getByRole("alert").textContent).toContain("Não foi possível")
    await fireEvent.click(screen.getByRole("button", { name: "[Tentar de novo]" }))
    expect(view.emitted("retry")).toHaveLength(1)
  })
})

describe("collections", () => {
  const props = { links: [], pending: false, failed: false }

  it("stays out of the page when there are none", async () => {
    await renderSuspended(HomeCollections, { props })

    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("shows a loading state", async () => {
    await renderSuspended(HomeCollections, { props: { ...props, pending: true } })

    expect(screen.getByRole("status")).toBeTruthy()
  })

  it("offers a retry after a failure", async () => {
    const view = await renderSuspended(HomeCollections, {
      props: { ...props, failed: true },
    })

    await fireEvent.click(screen.getByRole("button", { name: "[Tentar de novo]" }))
    expect(view.emitted("retry")).toHaveLength(1)
  })
})

describe("announcement bar", () => {
  const announcement = { id: "a", message: "[Aviso]", link_url: null }

  it("stays out of the header without an announcement", async () => {
    await renderSuspended(SiteHeader, {
      props: { menuLinks: [], cartCount: 0, whatsAppUrl: null },
    })

    expect(screen.queryByText("[Aviso]")).toBeNull()
  })

  it("shows the message the header receives", async () => {
    await renderSuspended(SiteHeader, {
      props: { menuLinks: [], cartCount: 0, whatsAppUrl: null, announcement },
    })

    expect(screen.getByText("[Aviso]")).toBeTruthy()
  })

  it("links the message when it has a link", async () => {
    await renderSuspended(AnnouncementBar, {
      props: { announcement: { ...announcement, link_url: "/colecao/x" } },
    })

    expect(screen.getByRole("link", { name: "[Aviso]" }).getAttribute("href")).toBe("/colecao/x")
  })
})

describe("product card data", () => {
  const alfa = productFixtures[0]!

  it("takes the prices of the cheapest variant and the product route", () => {
    expect(toProductCard(alfa)).toMatchObject({
      name: alfa.title,
      to: `/produto/${alfa.handle}`,
      price: 4990,
      compareAt: 6990,
      stock: "in",
    })
  })

  it("is out of stock only when every variant is", () => {
    const variants = alfa.variants.map((variant) => ({ ...variant, in_stock: false }))
    expect(toProductCard({ ...alfa, variants })?.stock).toBe("out")
  })

  it("skips a product without variants, which has no price to show", () => {
    expect(toProductCard({ ...alfa, variants: [] })).toBeNull()
  })
})
