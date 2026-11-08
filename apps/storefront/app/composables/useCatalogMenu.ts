import type { StoreProduct, StoreProductTaxon } from "@nozco/shared-types"

export interface MenuLink {
  label: string
  to: string
}

/** The data source has no taxonomy call yet, so the menu comes from the products for sale. */
export function menuLinksFrom(products: StoreProduct[]): MenuLink[] {
  const unique = (taxons: StoreProductTaxon[]) => [
    ...new Map(taxons.map((taxon) => [taxon.handle, taxon])).values(),
  ]
  const categories = unique(products.flatMap((product) => product.categories))
  const collections = unique(products.flatMap((product) => product.collection ?? []))
  return [
    ...categories.map(({ name, handle }) => ({ label: name, to: `/categoria/${handle}` })),
    ...collections.map(({ name, handle }) => ({ label: name, to: `/colecao/${handle}` })),
  ]
}

export const isCollectionLink = (link: MenuLink) => link.to.startsWith("/colecao/")

/** A failed call leaves the menu without these links; the rest of the layout still works. */
export function useCatalogMenu() {
  const { listProducts } = useProducts()
  return useAsyncData(
    "catalog-menu",
    async () => menuLinksFrom((await listProducts({ limit: 100 })).products),
    { default: (): MenuLink[] => [] },
  )
}
