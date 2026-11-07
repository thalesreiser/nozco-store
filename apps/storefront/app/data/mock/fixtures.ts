import type {
  StoreCartShippingOption,
  StorePaymentProvider,
  StoreProduct,
  StoreProductOption,
  StoreProductVariant,
} from "@nozco/shared-types"

// Fictional catalog for building screens without an API. Never reaches a production build: see
// `shouldBundleMockSource` and scripts/check-fixtures.mjs.
//
// The size and colour lists are EXAMPLES ONLY, because the size grid is still open (Q-03). Every name,
// description, price and stock number is invented and is not a business decision. Image URLs use the
// reserved example.com domain and do not load.

/** Unique string that lets the build check find these fixtures. Keep in sync with that script. */
export const FIXTURE_MARKER = "nozco-fictional-fixture-7f3a9c"

interface FixtureInput {
  slug: string
  title: string
  price: number
  compareAt: number | null
  sizes: string[]
  colors: string[]
  category: string
  collection: string | null
  /** Stock is 5 unless listed here, keyed by `size/colour`. */
  stock?: Record<string, number>
}

function makeProduct(input: FixtureInput): StoreProduct {
  const id = `prod_mock_${input.slug}`
  const option = (title: string, values: string[]): StoreProductOption => ({
    id: `opt_mock_${input.slug}_${title}`,
    title,
    values: values.map((value) => ({
      id: `optval_mock_${input.slug}_${value}`,
      value,
      option_id: `opt_mock_${input.slug}_${title}`,
    })),
  })
  const sizes = option("Tamanho", input.sizes)
  const colors = option("Cor", input.colors)

  const imagesOf = (color: string) =>
    [1, 2].map((rank) => ({
      id: `img_mock_${input.slug}_${color}_${rank}`,
      url: `https://example.com/fixtures/${input.slug}-${color}-${rank}.webp`.toLowerCase(),
      rank,
    }))

  const variants: StoreProductVariant[] = colors.values.flatMap((color) =>
    sizes.values.map((size) => ({
      id: `variant_mock_${input.slug}_${size.value}_${color.value}`,
      product_id: id,
      title: `${size.value} / ${color.value}`,
      sku: null,
      inventory_quantity: input.stock?.[`${size.value}/${color.value}`] ?? 5,
      options: [size, color],
      images: imagesOf(color.value),
      calculated_price: {
        calculated_amount: input.price,
        compare_at_amount: input.compareAt,
        currency_code: "brl" as const,
      },
    })),
  )

  const images = input.colors.flatMap(imagesOf)
  return {
    id,
    title: input.title,
    handle: input.slug,
    subtitle: "Produto fictício para desenvolvimento",
    description: "Peça inventada, usada apenas para testar as telas da loja.",
    thumbnail: images[0]?.url ?? null,
    options: [sizes, colors],
    variants,
    images,
    categories: [
      { id: `cat_mock_${input.category}`, handle: input.category, name: taxonName(input.category) },
    ],
    collection: input.collection
      ? {
          id: `col_mock_${input.collection}`,
          handle: input.collection,
          name: taxonName(input.collection),
        }
      : null,
    metadata: { fixture: FIXTURE_MARKER },
  }
}

const TAXON_NAMES: Record<string, string> = {
  "camisetas-exemplo": "Camisetas exemplo",
  "moletons-exemplo": "Moletons exemplo",
  "colecao-exemplo": "Coleção exemplo",
}

const taxonName = (handle: string) => TAXON_NAMES[handle] ?? handle

export const productFixtures: StoreProduct[] = [
  makeProduct({
    slug: "camiseta-ficticia-alfa",
    title: "Camiseta Fictícia Alfa",
    price: 4990,
    compareAt: 6990,
    sizes: ["P", "M", "G"],
    colors: ["Preto", "Branco"],
    category: "camisetas-exemplo",
    collection: "colecao-exemplo",
    stock: { "G/Branco": 0, "P/Preto": 1 },
  }),
  makeProduct({
    slug: "camiseta-ficticia-beta",
    title: "Camiseta Fictícia Beta",
    price: 5990,
    compareAt: null,
    sizes: ["M", "G"],
    colors: ["Cinza"],
    category: "camisetas-exemplo",
    collection: null,
  }),
  makeProduct({
    slug: "moletom-ficticio-gama",
    title: "Moletom Fictício Gama",
    price: 12990,
    compareAt: null,
    sizes: ["M", "G"],
    colors: ["Preto", "Cinza"],
    category: "moletons-exemplo",
    collection: "colecao-exemplo",
    stock: { "M/Cinza": 0, "G/Cinza": 0 },
  }),
]

export const shippingOptionFixtures: StoreCartShippingOption[] = [
  { id: "so_mock_economica", name: "Entrega fictícia econômica", amount: 1500 },
  { id: "so_mock_expressa", name: "Entrega fictícia expressa", amount: 2900 },
]

export const paymentProviderFixtures: StorePaymentProvider[] = [
  { id: "pp_mock_pix" },
  { id: "pp_mock_card" },
  { id: "pp_mock_boleto" },
]
