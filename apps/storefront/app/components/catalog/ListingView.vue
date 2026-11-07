<script setup lang="ts">
import type { StoreProductFacets } from "@nozco/shared-types"
import { nextTick, useTemplateRef, watch } from "vue"
import { navigateTo } from "#imports"
import type { RouteLocationRaw } from "vue-router"
import type { ListingState, ProductCardData } from "~/lib/listing"
import { activeFilterCount, productPath } from "~/lib/listing"
import ListingResults from "./ListingResults.vue"
import ListingToolbar from "./ListingToolbar.vue"

const props = defineProps<{
  title: string
  state: ListingState
  facets: StoreProductFacets | null
  products: ProductCardData[]
  count: number
  loading: boolean
  failed: boolean
  pageTo: (page: number) => RouteLocationRaw
}>()
const emit = defineEmits<{ change: [patch: Partial<ListingState>]; clear: []; retry: [] }>()

// A new page replaces what the visitor was reading, so reading and focus restart at the title. A filter
// keeps the focus on its control, and the count below announces the result.
const heading = useTemplateRef<HTMLHeadingElement>("heading")
watch(
  () => props.state.page,
  async () => {
    await nextTick()
    heading.value?.focus()
  },
)

// Choosing a size comes first, and the product page does that. It arrives with FE-04.2a.
const buy = (product: ProductCardData) => navigateTo(productPath(product.handle))
</script>

<template>
  <div class="flex flex-col gap-stack px-4 py-section lg:gap-grid lg:px-page">
    <h1
      ref="heading"
      tabindex="-1"
      class="font-display text-heading font-heavy uppercase focus-visible:outline-none"
    >
      {{ title }}
    </h1>
    <ListingToolbar
      :facets="facets"
      :state="state"
      @change="emit('change', $event)"
      @clear="emit('clear')"
    />
    <p role="status" class="min-h-5 text-note text-muted-foreground">
      <template v-if="!loading && !failed">
        {{ $t("listing.count", count) }}
      </template>
    </p>
    <ListingResults
      :loading="loading"
      :failed="failed"
      :products="products"
      :count="count"
      :page="state.page"
      :has-filters="activeFilterCount(state) > 0"
      :page-to="pageTo"
      @retry="emit('retry')"
      @clear="emit('clear')"
      @buy="buy"
    />
  </div>
</template>
