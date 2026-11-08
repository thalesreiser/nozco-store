<script setup lang="ts">
import { computed } from "vue"
import { navigateTo, useAsyncData } from "#imports"
import HomeCollections from "~/components/home/HomeCollections.vue"
import HomeHero from "~/components/home/HomeHero.vue"
import HomeNewArrivals from "~/components/home/HomeNewArrivals.vue"
import HomeValueStrip from "~/components/home/HomeValueStrip.vue"
import { isCollectionLink, useCatalogMenu } from "~/composables/useCatalogMenu"
import { useHomeContent } from "~/composables/useHomeContent"
import { useProducts } from "~/composables/useProducts"
import { toProductCard } from "~/lib/product-card"
import type { ProductCardData } from "~/lib/product-card"

// Blocks and order: ADR 008. Limits follow the mock-up, one row of four cards and three collections.
const NEW_ARRIVALS = 4
const COLLECTIONS = 3

const { listProducts } = useProducts()
const arrivals = useAsyncData("home-new-arrivals", () =>
  listProducts({ order: "newest", limit: NEW_ARRIVALS }),
)
const menu = useCatalogMenu()
// Awaited so the server always sends the hero title, the largest element on first paint.
const { data: content } = await useHomeContent()

const cards = computed(() =>
  (arrivals.data.value?.products ?? [])
    .map(toProductCard)
    .filter((card): card is ProductCardData => card !== null),
)
const collections = computed(() => menu.data.value.filter(isCollectionLink).slice(0, COLLECTIONS))

/** Size and colour come first, so buying from a card leads to the product page. */
const openProduct = (to: string) => navigateTo(to)
</script>

<template>
  <div>
    <HomeHero :banners="content.banners" />
    <HomeValueStrip />
    <HomeNewArrivals
      :cards="cards"
      :pending="arrivals.status.value === 'pending'"
      :failed="arrivals.error.value !== undefined"
      :size="NEW_ARRIVALS"
      @buy="openProduct"
      @retry="arrivals.refresh()"
    />
    <HomeCollections
      :links="collections"
      :pending="menu.status.value === 'pending'"
      :failed="menu.error.value !== undefined"
      @retry="menu.refresh()"
    />
  </div>
</template>
