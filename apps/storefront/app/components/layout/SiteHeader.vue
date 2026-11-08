<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import type { MenuLink } from "~/composables/useCatalogMenu"
import BrandMark from "~/components/base/BrandMark.vue"
import { Button } from "~/components/ui/button"
import AnnouncementBar from "./AnnouncementBar.vue"
import MobileMenu from "./MobileMenu.vue"
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

<template>
  <header>
    <AnnouncementBar />
    <div
      class="ground-brand flex items-center justify-between gap-inline border-b-3 px-4 py-2 max-[22.5rem]:gap-2 lg:px-page lg:py-5"
    >
      <div class="flex items-center gap-2">
        <div class="lg:hidden">
          <MobileMenu :links="links" :whats-app-url="whatsAppUrl" />
        </div>
        <NuxtLink to="/" :aria-label="$t('layout.home')" class="flex min-h-touch items-center">
          <BrandMark />
        </NuxtLink>
      </div>
      <div class="flex items-center gap-inline">
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
        <Button as-child class="max-[22.5rem]:px-2">
          <NuxtLink to="/carrinho" :aria-label="cartLabel">
            {{ $t("layout.cart.text") }}
            <span :class="{ invisible: cartCount === null }">({{ cartCount ?? 0 }})</span>
          </NuxtLink>
        </Button>
      </div>
    </div>
  </header>
</template>
