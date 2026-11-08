<script setup lang="ts">
import EmptyState from "~/components/base/EmptyState.vue"
import ErrorState from "~/components/base/ErrorState.vue"
import ProductCard from "~/components/catalog/ProductCard.vue"
import ProductCardSkeleton from "~/components/catalog/ProductCardSkeleton.vue"
import { Button } from "~/components/ui/button"
import type { ProductCardData } from "~/lib/product-card"

defineProps<{
  cards: ProductCardData[]
  pending: boolean
  failed: boolean
  /** How many skeletons stand in for the cards. */
  size: number
}>()
defineEmits<{ buy: [to: string]; retry: [] }>()
</script>

<template>
  <section aria-labelledby="home-new-arrivals" class="px-page py-section">
    <h2 id="home-new-arrivals" class="mb-4 text-heading uppercase">
      {{ $t("home.newArrivals.title") }}
    </h2>
    <ErrorState v-if="failed" heading-level="h3" :title="$t('home.newArrivals.error')">
      <Button type="button" @click="$emit('retry')">
        {{ $t("home.retry") }}
      </Button>
    </ErrorState>
    <EmptyState
      v-else-if="!pending && cards.length === 0"
      heading-level="h3"
      :title="$t('home.newArrivals.empty')"
    />
    <div v-else class="grid grid-cols-2 gap-grid lg:grid-cols-4">
      <template v-if="pending">
        <ProductCardSkeleton v-for="slot in size" :key="slot" />
      </template>
      <template v-else>
        <ProductCard
          v-for="card in cards"
          :key="card.id"
          :name="card.name"
          :to="card.to"
          :price="card.price"
          :compare-at="card.compareAt"
          :badge="card.compareAt ? $t('home.newArrivals.saleBadge') : undefined"
          :stock="card.stock"
          :image-src="card.imageSrc"
          @buy="$emit('buy', card.to)"
        />
      </template>
    </div>
  </section>
</template>
