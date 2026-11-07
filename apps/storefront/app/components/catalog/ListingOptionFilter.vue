<script setup lang="ts">
import type { StoreProductFacet } from "@nozco/shared-types"
import { computed } from "vue"
import ColourSwatch from "~/components/catalog/ColourSwatch.vue"
import SizeSelector from "~/components/catalog/SizeSelector.vue"
import { Button } from "~/components/ui/button"
import { OPTION_TITLES } from "~/lib/catalog-contract"
import type { SelectableOption } from "~/lib/options"

const props = defineProps<{ facet: StoreProductFacet; modelValue?: string }>()
defineEmits<{ "update:modelValue": [value: string | undefined] }>()

// The other filters can remove the selected value from the facet. It stays listed so it can be seen.
const options = computed<SelectableOption[]>(() => {
  const values = props.facet.values.map(({ value }) => value)
  const listed =
    props.modelValue && !values.includes(props.modelValue) ? [props.modelValue, ...values] : values
  return listed.map((value) => ({ value, label: value }))
})
</script>

<template>
  <div class="flex flex-col items-start gap-2">
    <component
      :is="facet.title === OPTION_TITLES.color ? ColourSwatch : SizeSelector"
      :label="facet.title"
      :options="options"
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
    />
    <Button
      v-if="modelValue"
      variant="link"
      size="sm"
      type="button"
      class="px-0 underline"
      :aria-label="$t('listing.filters.clearNamed', { name: facet.title })"
      @click="$emit('update:modelValue', undefined)"
    >
      {{ $t("listing.filters.clearOne") }}
    </Button>
  </div>
</template>
