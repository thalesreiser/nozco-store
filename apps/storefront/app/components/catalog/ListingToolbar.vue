<script setup lang="ts">
import type { StoreProductFacets, StoreProductOrder } from "@nozco/shared-types"
import type { Component } from "vue"
import { computed, onBeforeUnmount, onMounted, shallowRef, useId } from "vue"
import { Button } from "~/components/ui/button"
import { PRODUCT_ORDERS } from "~/lib/catalog-contract"
import type { ListingState } from "~/lib/listing"
import { activeFilterCount, filterLabel } from "~/lib/listing"

const props = defineProps<{ facets: StoreProductFacets | null; state: ListingState }>()
const emit = defineEmits<{ change: [patch: Partial<ListingState>]; clear: [] }>()

const sortId = useId()
const activeCount = computed(() => activeFilterCount(props.state))
const hasPrice = computed(
  () => props.state.minPrice !== undefined || props.state.maxPrice !== undefined,
)
const setOrder = (event: Event) =>
  emit("change", { order: (event.target as HTMLSelectElement).value as StoreProductOrder })

// The working filters load after the page, for this screen's width only: with the form validation and
// the menu positioning in the first load, this page would pass the JS budget. The server sends plain
// buttons of the same size, which they replace.
const filterControls = shallowRef<Component | null>(null)
const loadFilters = (isWide: boolean): Promise<{ default: Component }> =>
  isWide ? import("./ListingDesktopFilters.vue") : import("./ListingFilterDrawer.vue")
const showFiltersFor = async (isWide: boolean) => {
  filterControls.value = (await loadFilters(isWide)).default
}
const onWidthChange = (event: MediaQueryListEvent) => void showFiltersFor(event.matches)
let wide: MediaQueryList | undefined
onMounted(() => {
  wide = globalThis.matchMedia("(min-width: 64rem)")
  wide.addEventListener("change", onWidthChange)
  void showFiltersFor(wide.matches)
})
onBeforeUnmount(() => wide?.removeEventListener("change", onWidthChange))
</script>

<template>
  <div class="flex items-center justify-between gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <component
        :is="filterControls"
        v-if="filterControls && facets"
        :facets="facets"
        :state="state"
        @change="emit('change', $event)"
        @clear="emit('clear')"
      />
      <template v-else>
        <Button variant="outline" class="shrink-0 lg:hidden" :disabled="!facets">
          {{ $t("listing.filters.open") }}
          <template v-if="activeCount > 0"> ({{ activeCount }}) </template>
        </Button>
        <template v-if="facets">
          <Button
            v-for="facet in facets.options"
            :key="facet.title"
            variant="outline"
            class="hidden lg:inline-flex"
          >
            {{ filterLabel(facet.title, state.options[facet.title]) }}
            <span aria-hidden="true">&#9662;</span>
          </Button>
          <Button variant="outline" class="hidden lg:inline-flex">
            {{
              filterLabel(
                $t("listing.filters.price"),
                hasPrice ? $t("listing.price.set") : undefined,
              )
            }}
            <span aria-hidden="true">&#9662;</span>
          </Button>
        </template>
      </template>
      <Button
        v-if="activeCount > 0"
        variant="link"
        type="button"
        class="hidden underline lg:inline-flex"
        @click="emit('clear')"
      >
        {{ $t("listing.filters.clearAll") }}
      </Button>
    </div>

    <div class="min-w-0">
      <label :for="sortId" class="sr-only">{{ $t("listing.order.label") }}</label>
      <select
        :id="sortId"
        :value="state.order"
        class="h-touch w-full min-w-0 border border-input bg-background px-2 text-action font-action text-foreground"
        @change="setOrder"
      >
        <option v-for="order in PRODUCT_ORDERS" :key="order" :value="order">
          {{ $t(`listing.order.${order}`) }}
        </option>
      </select>
    </div>
  </div>
</template>
