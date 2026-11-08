<script setup lang="ts">
import { computed, onMounted } from "vue"
import SiteFooter from "~/components/layout/SiteFooter.vue"
import SiteHeader from "~/components/layout/SiteHeader.vue"
import { useCartCount } from "~/composables/useCartCount"
import { useCatalogMenu } from "~/composables/useCatalogMenu"
import { useHomeContent } from "~/composables/useHomeContent"
import { useStoreInfo } from "~/composables/useStoreInfo"

const storeInfo = useStoreInfo()
const { count, refresh } = useCartCount()
// Only in the browser: the cart belongs to one visitor and pages can be cached for everyone.
onMounted(refresh)

const { data: menuLinks } = await useCatalogMenu()
const { data: homeContent } = await useHomeContent()
// The bar has room for one message: the first in display order.
const announcement = computed(() => homeContent.value.announcements[0] ?? null)
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#conteudo"
      class="ground-store sr-only z-50 focus:not-sr-only focus:absolute focus:p-4 focus:text-action"
    >
      {{ $t("layout.skipToContent") }}
    </a>
    <SiteHeader
      :menu-links="menuLinks"
      :cart-count="count"
      :whats-app-url="storeInfo.whatsAppUrl"
      :announcement="announcement"
    />
    <main id="conteudo" class="flex-1 focus-visible:outline-none" tabindex="-1">
      <slot />
    </main>
    <SiteFooter :store-info="storeInfo" />
  </div>
</template>
