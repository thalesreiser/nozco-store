<script setup lang="ts">
import { computed } from "vue"
import type { RouteLocationRaw } from "vue-router"
import EmptyState from "~/components/base/EmptyState.vue"
import ErrorState from "~/components/base/ErrorState.vue"
import { Button, buttonVariants } from "~/components/ui/button"
import type { ProductCardData } from "~/lib/listing"
import { LISTING_PAGE_SIZE, productPath } from "~/lib/listing"
import ListingPagination from "./ListingPagination.vue"
import ProductCard from "./ProductCard.vue"
import ProductCardSkeleton from "./ProductCardSkeleton.vue"

const props = defineProps<{
  loading?: boolean
  failed?: boolean
  products: ProductCardData[]
  count: number
  page: number
  hasFilters?: boolean
  pageTo: (page: number) => RouteLocationRaw
}>()
const emit = defineEmits<{ retry: []; clear: []; buy: [product: ProductCardData] }>()

const pageCount = computed(() => Math.ceil(props.count / LISTING_PAGE_SIZE))
const skeletons = 8
const gridClass =
  "grid grid-cols-2 gap-x-stack gap-y-grid md:grid-cols-3 lg:grid-cols-4 lg:gap-x-grid"
</script>

<template>
  <div v-if="failed">
    <ErrorState :title="$t('listing.error.title')" :description="$t('listing.error.description')">
      <Button type="button" variant="outline" @click="emit('retry')">
        {{ $t("listing.error.retry") }}
      </Button>
    </ErrorState>
  </div>

  <div v-else-if="loading">
    <p role="status" class="sr-only">
      {{ $t("state.loading") }}
    </p>
    <!-- One announcement is enough, so the cards' own status is hidden. -->
    <div aria-hidden="true" :class="gridClass">
      <ProductCardSkeleton v-for="index in skeletons" :key="index" />
    </div>
  </div>

  <div v-else-if="products.length === 0">
    <EmptyState
      v-if="count > 0"
      :title="$t('listing.pastTheEnd.title')"
      :description="$t('listing.pastTheEnd.description')"
    >
      <NuxtLink :to="pageTo(1)" :class="buttonVariants({ variant: 'outline' })">
        {{ $t("listing.pastTheEnd.action") }}
      </NuxtLink>
    </EmptyState>
    <EmptyState
      v-else-if="hasFilters"
      :title="$t('listing.emptyFiltered.title')"
      :description="$t('listing.emptyFiltered.description')"
    >
      <Button type="button" variant="outline" @click="emit('clear')">
        {{ $t("listing.filters.clearAll") }}
      </Button>
    </EmptyState>
    <EmptyState
      v-else
      :title="$t('listing.empty.title')"
      :description="$t('listing.empty.description')"
    >
      <NuxtLink to="/" :class="buttonVariants({ variant: 'outline' })">
        {{ $t("listing.empty.action") }}
      </NuxtLink>
    </EmptyState>
  </div>

  <div v-else class="flex flex-col gap-section">
    <ul :class="gridClass">
      <li v-for="product in products" :key="product.handle" class="flex">
        <ProductCard
          class="w-full"
          :name="product.title"
          :to="productPath(product.handle)"
          :price="product.price"
          :compare-at="product.compareAt"
          :badge="product.compareAt ? $t('listing.saleBadge') : undefined"
          :stock="product.stock"
          :image-src="product.image ?? undefined"
          @buy="emit('buy', product)"
        />
      </li>
    </ul>
    <ListingPagination
      v-if="pageCount > 1"
      :page="page"
      :page-count="pageCount"
      :page-to="pageTo"
    />
  </div>
</template>
