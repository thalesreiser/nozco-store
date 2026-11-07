import { renderSuspended } from "@nuxt/test-utils/runtime"
import { fireEvent, screen } from "@testing-library/vue"
import { beforeEach, describe, expect, it } from "vitest"
import ListingResults from "~/components/catalog/ListingResults.vue"
import ProductCard from "~/components/catalog/ProductCard.vue"
import { resetDataSources } from "~/data"
import type { ProductCardData } from "~/lib/listing"
import CategoryPage from "~/pages/categoria/[...slug].vue"

const card: ProductCardData = {
  handle: "camiseta",
  title: "Camiseta",
  price: 4990,
  compareAt: 6990,
  stock: "in",
  image: null,
}
const base = { products: [], count: 0, page: 1, pageTo: (page: number) => ({ query: { page } }) }

describe("ListingResults states", () => {
  it("shows one loading announcement and no product", async () => {
    await renderSuspended(ListingResults, { props: { ...base, loading: true } })

    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.queryByRole("list")).toBeNull()
  })

  it("offers a retry on error", async () => {
    const view = await renderSuspended(ListingResults, { props: { ...base, failed: true } })

    expect(screen.getByRole("alert")).toBeTruthy()
    await fireEvent.click(screen.getByRole("button"))
    expect(view.emitted("retry")).toHaveLength(1)
  })

  it("offers to clear the filters when they emptied the list", async () => {
    const view = await renderSuspended(ListingResults, { props: { ...base, hasFilters: true } })

    await fireEvent.click(screen.getByRole("button", { name: "[Limpar filtros]" }))
    expect(view.emitted("clear")).toHaveLength(1)
  })

  it("links back to the start when the category is empty", async () => {
    await renderSuspended(ListingResults, { props: base })

    expect(screen.getByRole("link", { name: "[Voltar para o início]" })).toBeTruthy()
  })

  it("links to the first page past the last one", async () => {
    await renderSuspended(ListingResults, { props: { ...base, count: 5, page: 9 } })

    expect(screen.getByRole("link", { name: "[Ir para a primeira página]" })).toBeTruthy()
  })

  it("lists the cards, and paginates only with more than a page", async () => {
    await renderSuspended(ListingResults, { props: { ...base, products: [card], count: 1 } })

    expect(screen.getByRole("link", { name: "Camiseta" })).toBeTruthy()
    expect(screen.getByText("R$ 49,90", { exact: false })).toBeTruthy()
    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("marks the current page and leaves out the arrow that goes nowhere", async () => {
    await renderSuspended(ListingResults, { props: { ...base, products: [card], count: 21 } })

    expect(screen.getByRole("navigation", { name: "Páginas" })).toBeTruthy()
    expect(screen.queryByRole("link", { name: "Página anterior" })).toBeNull()
    expect(screen.getByRole("link", { name: "Próxima página" })).toBeTruthy()
  })
})

describe("ProductCard", () => {
  it("cannot be bought when sold out, and says so", async () => {
    await renderSuspended(ProductCard, {
      props: { name: "Camiseta", to: "/x", price: 100, stock: "out" },
    })

    expect(screen.getByRole("button", { name: "Comprar Camiseta" })).toHaveProperty(
      "disabled",
      true,
    )
    expect(screen.getByText("[ESGOTADO]")).toBeTruthy()
  })
})

describe("category page", () => {
  beforeEach(() => resetDataSources())

  it("shows the name of the category and its products", async () => {
    useRuntimeConfig().public.dataSource = "mock"
    const view = await renderSuspended(CategoryPage, { route: "/categoria/moletons-exemplo" })

    expect(await screen.findByRole("heading", { level: 1, name: "Moletons exemplo" })).toBeTruthy()
    expect(await screen.findByRole("link", { name: "Moletom Fictício Gama" })).toBeTruthy()
    // Still mounted, it would follow the next test route and answer for it with this source.
    view.unmount()
  })

  it("shows the error state when the source fails", async () => {
    useRuntimeConfig().public.dataSource = "api"
    await renderSuspended(CategoryPage, { route: "/categoria/falha-exemplo" })

    expect(await screen.findByRole("alert")).toBeTruthy()
    useRuntimeConfig().public.dataSource = "mock"
  })
})
