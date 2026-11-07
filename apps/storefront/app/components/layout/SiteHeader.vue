<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { MenuLink } from "~/composables/useCatalogMenu"
import BrandMark from "~/components/base/BrandMark.vue"
import { Button } from "~/components/ui/button"
import AnnouncementBar from "./AnnouncementBar.vue"
import MobileMenu from "./MobileMenu.vue"
import MobileSearch from "./MobileSearch.vue"
import SearchForm from "./SearchForm.vue"

const props = defineProps<{
  menuLinks: MenuLink[]
  /** Null while unknown: the number stays out, keeping its space so the header does not move. */
  cartCount: number | null
  whatsAppUrl: string | null
}>()

const { t } = useI18n()

const links = computed<MenuLink[]>(() => [
  ...props.menuLinks,
  { label: t("layout.nav.tracking"), to: "/rastreio" },
])
const cartLabel = computed(() =>
  props.cartCount === null
    ? t("layout.cart.labelUnknown")
    : t("layout.cart.label", { count: props.cartCount }, props.cartCount),
)
</script>

<!-- On phones the header box is removed, so the row sticks against the whole page and not only against
     the header. Its height (63 px) is also in the scroll padding of main.css. -->
<template>
  <header class="contents lg:block">
    <AnnouncementBar />
    <div
      class="ground-brand flex items-center justify-between gap-2 border-b-3 px-4 py-2 max-lg:sticky max-lg:top-0 max-lg:z-30 lg:gap-inline lg:px-page lg:py-5"
    >
      <div class="flex items-center gap-2 max-lg:min-w-0 max-lg:flex-1">
        <div class="lg:hidden">
          <MobileMenu :links="links" :whats-app-url="whatsAppUrl" />
        </div>
        <NuxtLink
          to="/"
          :aria-label="$t('layout.home')"
          class="flex min-h-touch items-center max-lg:max-w-39 max-lg:min-w-0 max-lg:flex-1"
        >
          <BrandMark class="max-lg:h-auto max-lg:w-full" />
        </NuxtLink>
      </div>
      <div class="flex shrink-0 items-center gap-1 lg:gap-inline">
        <nav class="hidden lg:block" :aria-label="$t('layout.nav.label')">
          <ul class="flex items-center gap-inline">
            <li v-for="link in links" :key="link.to">
              <NuxtLink
                :to="link.to"
                class="flex min-h-touch items-center font-emphasis text-link hover:text-link-hover aria-[current=page]:underline"
              >
                {{ link.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <SearchForm class="hidden lg:flex" />
        <MobileSearch />
        <Button as-child class="max-lg:px-2">
          <NuxtLink to="/carrinho" :aria-label="cartLabel">
            {{ $t("layout.cart.text") }}
            <span :class="{ invisible: cartCount === null }">({{ cartCount ?? 0 }})</span>
          </NuxtLink>
        </Button>
      </div>
    </div>
  </header>
</template>
