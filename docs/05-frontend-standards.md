# 05 - Frontend standards

These rules come from the tabacaria project and apply to every storefront task. Visual choices (fonts,
component style, page layouts) are decisions for Thales, listed in
[03 - Open questions](03-open-questions.md).

## Route map

| Route | Page | Rendering | Cache | Login | Task |
|---|---|---|---|---|---|
| `/` | Home | SSR | SWR 10 min | No | FE-11.1 |
| `/categoria/[...slug]` | Listing by category | SSR | SWR 10 min | No | FE-04.1 |
| `/colecao/[slug]` | Listing by collection | SSR | SWR 10 min | No | FE-04.1 |
| `/busca` | Search results | SSR | None | No | FE-04.3 |
| `/produto/[handle]` | Product | SSR, stock refreshed on the client | SWR 10 min | No | FE-04.2 |
| `/carrinho` | Cart | Client | None | No | FE-05.1 |
| `/checkout` | Checkout | Client | None | DEC-05 | FE-06 |
| `/pedido/[id]` | Confirmation | Client | None | No, token in the link | FE-06.4 |
| `/rastreio` | Order tracking | SSR | None | No | FE-07.1 |
| `/trocas/solicitar` | Exchange or return request | Client | None | No | FE-07.2 |
| `/conta/*` | Sign-in and customer area | Client | None | Yes | FE-03.1, FE-07.3 |
| `/institucional/[slug]` | About, FAQ, contact, legal | Pre-rendered | Static | No | FE-11.2 |

## Components
- Three layers: `ui/` (shadcn-vue primitives), `base/` (brand pieces) and domain folders (`catalog/`,
  `cart/`, `checkout/`, `account/`). A layer only imports from the one below.
- Design tokens live in one place. Components use semantic names and never raw colours or sizes.
- `<script setup lang="ts">` with typed `defineProps` and `defineEmits`.
- Domain components receive props and emit events. Pages call the API through composables.
- Every component that shows data has four states: loading (skeleton), empty, error and content.
- Prices always go through `BasePrice` (BRL, integer cents). Medusa v2 returns major units; `server/utils/store-mappers.ts` converts them.
- An internal `/_componentes` gallery, visible only in development and preview, shows every component in
  every state for visual review.

## Data
- Components never call the API. Composables (`useProducts`, `useCart`, `useCheckout`) are the only code
  that knows where data comes from; `NUXT_PUBLIC_DATA_SOURCE` selects `mock` or `api`.
- Fixtures use fictional products and customers and stay out of the production build.
- Login, checkout and payment go through `server/api/*`, which keeps the customer token in an `httpOnly`
  cookie. Server routes validate with Zod and return `{ code, message }`.
- The cart lives in Medusa. The Pinia store mirrors the last API response; `cart_id` lives in a cookie.
- Nothing personal or secret goes to `localStorage`.
- Server routes use only APIs compatible with Cloudflare.

## Forms
- VeeValidate with the Zod schemas from `packages/shared-types`.
- Masked inputs (CPF, CEP, phone) send unmasked values.
- Errors appear next to the field, in plain Portuguese, and focus moves to the first error.

## Apparel patterns
- Choosing a colour changes the gallery. Unavailable sizes stay visible and cannot be selected.
- The size guide opens in a dialog without leaving the product page.
- On mobile, the add-to-cart button stays fixed at the bottom and filters open in a drawer.
- Adding a product opens the mini-cart.
- Stock shown on the product page is refreshed on the client, because the page itself is cached.

## Accessibility
- WCAG 2.1 AA, keyboard navigation, visible focus, 44 x 44 px touch targets.
- Colour swatches have text labels, so colour is never the only signal. This matters in a greyscale UI.
- axe runs on every base component and key page.

## Performance
- Mobile budget: LCP < 2.5 s, CLS < 0.1, initial JS < 170 KB gzip, Lighthouse ≥ 90.
- Images through `<NuxtImg>` or `<NuxtPicture>` with `sizes`, WebP or AVIF and lazy loading.
- Self-hosted fonts.

## SEO, privacy and security
- Meta tags, Open Graph, schema.org `Product` and `Offer`, sitemap and canonical URLs for filtered pages.
- Analytics and any pixel load only after consent, and no event carries personal data.
- Security headers through `nuxt-security`. `v-html` is forbidden except for Nuxt-rendered institutional
  content.
- Interface text in Brazilian Portuguese, in `i18n/locales/pt-BR.json`.
