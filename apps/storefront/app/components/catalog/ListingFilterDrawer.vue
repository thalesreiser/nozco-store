<script setup lang="ts">
import type { StoreProductFacets } from "@nozco/shared-types"
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "reka-ui"
import { computed } from "vue"
import { Button } from "~/components/ui/button"
import type { ListingState } from "~/lib/listing"
import { activeFilterCount, withOption } from "~/lib/listing"
import ListingOptionFilter from "./ListingOptionFilter.vue"
import ListingPriceFilter from "./ListingPriceFilter.vue"

// Every filter in a drawer (ADR 009). Reka traps the focus and gives it back to the button on close.
// ListingToolbar loads this file only on a narrow screen, and removes it if the screen becomes wide.
const props = defineProps<{ facets: StoreProductFacets; state: ListingState }>()
const emit = defineEmits<{ change: [patch: Partial<ListingState>]; clear: [] }>()

const activeCount = computed(() => activeFilterCount(props.state))
</script>

<template>
  <DialogRoot>
    <DialogTrigger as-child>
      <Button variant="outline" class="shrink-0">
        {{ $t("listing.filters.open") }}
        <template v-if="activeCount > 0"> ({{ activeCount }}) </template>
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-40 bg-foreground/50" />
      <DialogContent
        :aria-describedby="undefined"
        class="fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background text-foreground shadow-overlay sm:max-w-sm"
      >
        <div class="flex items-center justify-between border-b border-border px-4 py-2">
          <DialogTitle class="text-note font-action tracking-label">
            {{ $t("listing.filters.title") }}
          </DialogTitle>
          <DialogClose as-child>
            <Button size="icon" variant="ghost" :aria-label="$t('listing.filters.close')">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m5 5 14 14M19 5 5 19" />
              </svg>
            </Button>
          </DialogClose>
        </div>
        <div class="flex flex-1 flex-col gap-section overflow-y-auto p-4">
          <ListingOptionFilter
            v-for="facet in facets.options"
            :key="facet.title"
            :facet="facet"
            :model-value="state.options[facet.title]"
            @update:model-value="
              emit('change', { options: withOption(state, facet.title, $event) })
            "
          />
          <ListingPriceFilter
            :range="facets.price"
            :min="state.minPrice"
            :max="state.maxPrice"
            @apply="emit('change', $event)"
          />
        </div>
        <div class="flex flex-col gap-2 border-t border-border p-4">
          <DialogClose as-child>
            <Button type="button">
              {{ $t("listing.filters.showResults") }}
            </Button>
          </DialogClose>
          <Button v-if="activeCount > 0" type="button" variant="outline" @click="emit('clear')">
            {{ $t("listing.filters.clearAll") }}
          </Button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
