<script setup lang="ts">
import OptionGroup from "~/components/base/OptionGroup.vue"
import type { SelectableOption } from "~/lib/options"

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
  />
</template>
