# Storefront (Nuxt 4)

Read the root `CLAUDE.md` first. `docs/05-frontend-standards.md` is the full reference, including the
route map.

## Rules

- Components never call the API directly; pages use typed composables (`useProducts`, `useCart`,
  `useCheckout`), the only code that knows where data comes from. `NUXT_PUBLIC_DATA_SOURCE` selects
  `mock` or `api`.
- Tasks ending in `a` build the screen on fictional mock data and are the design review; tasks ending in
  `b` connect the API without changing composable signatures.
- Login, checkout and payment go through Nuxt server routes (`server/api/*`), which keep the customer
  token in an `httpOnly` cookie. The browser never sees the token.
- The cart lives in Medusa; the Pinia store only mirrors the last API response. Nothing personal or
  secret goes to `localStorage`.
- Every data component has loading, empty, error and content states.
- Prices always go through the `BasePrice` component (BRL, integer cents). Medusa v2 returns major units
  (20.5 is R$ 20,50); `server/utils/store-mappers.ts` converts them.
- Components use semantic design tokens, never raw colours or sizes.
- Forms: VeeValidate + Zod with the shared schemas; masked inputs send unmasked values.
- Accessibility: WCAG 2.1 AA, keyboard navigation, visible focus, 44 x 44 px touch targets. Colour is
  never the only signal.
- Performance budget (mobile): LCP < 2.5 s, CLS < 0.1, initial JS < 170 KB gzip; images through
  `<NuxtImg>` or `<NuxtPicture>` with `sizes`.
- Analytics and pixels load only after cookie consent; no personal data in events.
- `v-html` is forbidden, except for Nuxt-rendered institutional content.
- Interface text in Brazilian Portuguese, kept in `i18n/locales/pt-BR.json`.
- Server routes use only APIs compatible with Cloudflare.
- Design, UI and UX choices are never decided here: propose options and wait (root `CLAUDE.md`).
