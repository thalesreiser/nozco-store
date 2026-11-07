<script setup lang="ts">
import OptionGroup from "~/components/base/OptionGroup.vue"
import type { SelectableOption } from "~/lib/options"

// The name is always written, so colour is never the only signal. The chip only appears when an option
// has `fill`: products have a colour name but no colour value yet (see the PR's pending decisions).
withDefaults(
  defineProps<{
    label: string
    options: SelectableOption[]
    modelValue?: string
    disabled?: boolean
    error?: string
  }>(),
  { modelValue: undefined, error: undefined },
)
defineEmits<{ "update:modelValue": [value: string] }>()
</script>

<template>
  <OptionGroup
    :label="label"
    :options="options"
    :model-value="modelValue"
    :disabled="disabled"
    :error="error"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #option="{ option }">
      <span
        v-if="option.fill"
        aria-hidden="true"
        class="size-5 shrink-0 border border-input"
        :style="{ backgroundColor: option.fill }"
      />
    </template>
  </OptionGroup>
</template>
