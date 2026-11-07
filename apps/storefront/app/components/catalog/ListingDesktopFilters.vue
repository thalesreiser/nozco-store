<script setup lang="ts">
import type { StoreProductFacets } from "@nozco/shared-types"
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from "reka-ui"
import { computed } from "vue"
import { Button } from "~/components/ui/button"
import type { ListingState } from "~/lib/listing"
import { withOption } from "~/lib/listing"
import ListingOptionFilter from "./ListingOptionFilter.vue"
import ListingPriceFilter from "./ListingPriceFilter.vue"

// One menu per filter, above the products (ADR 009). ListingToolbar loads this file only on a wide screen.
const props = defineProps<{ facets: StoreProductFacets; state: ListingState }>()
const emit = defineEmits<{ change: [patch: Partial<ListingState>] }>()

const hasPrice = computed(
  () => props.state.minPrice !== undefined || props.state.maxPrice !== undefined,
)
const popoverClass = "z-30 flex w-80 flex-col gap-stack bg-popover p-4 shadow-overlay"
</script>

<template>
  <PopoverRoot v-for="facet in facets.options" :key="facet.title">
    <PopoverTrigger as-child>
      <Button variant="outline">
        {{ facet.title
        }}<template v-if="state.options[facet.title]">
          : {{ state.options[facet.title] }}
        </template>
        <span aria-hidden="true">&#9662;</span>
      </Button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent align="start" :side-offset="4" :class="popoverClass">
        <ListingOptionFilter
          :facet="facet"
          :model-value="state.options[facet.title]"
          @update:model-value="emit('change', { options: withOption(state, facet.title, $event) })"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
  <PopoverRoot>
    <PopoverTrigger as-child>
      <Button variant="outline">
        {{ $t("listing.filters.price")
        }}<template v-if="hasPrice"> : {{ $t("listing.price.set") }} </template>
        <span aria-hidden="true">&#9662;</span>
      </Button>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent align="start" :side-offset="4" :class="popoverClass">
        <ListingPriceFilter
          :range="facets.price"
          :min="state.minPrice"
          :max="state.maxPrice"
          @apply="emit('change', $event)"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
