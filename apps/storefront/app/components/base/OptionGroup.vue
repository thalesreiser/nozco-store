<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from "reka-ui"
import { useId } from "vue"
import type { SelectableOption } from "~/lib/options"
import FieldError from "./FieldError.vue"

// What SizeSelector and ColourSwatch share. A radio group gives them the arrow keys and the single tab
// stop, and skips the unavailable options.
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

const labelId = useId()
const errorId = useId()
</script>

<template>
  <div class="flex flex-col gap-stack">
    <span :id="labelId" class="text-note font-emphasis">{{ label }}</span>
    <RadioGroupRoot
      :model-value="modelValue"
      :disabled="disabled"
      orientation="horizontal"
      class="flex flex-wrap gap-2"
      :class="{ 'opacity-50': disabled }"
      :aria-labelledby="labelId"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? errorId : undefined"
      @update:model-value="$emit('update:modelValue', String($event))"
    >
      <RadioGroupItem
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.available === false"
        class="inline-flex min-h-touch min-w-touch items-center justify-center gap-2 border border-input px-3 text-action font-action transition-colors data-[disabled]:pointer-events-none data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=unchecked]:hover:bg-accent data-[state=unchecked]:hover:text-accent-foreground"
        :class="{
          'border-border text-muted-foreground line-through': option.available === false,
        }"
      >
        <slot name="option" :option="option" />
        {{ option.label }}
        <span v-if="option.available === false" class="sr-only"
          >({{ $t("option.unavailable") }})</span
        >
      </RadioGroupItem>
    </RadioGroupRoot>
    <FieldError v-if="error" :id="errorId" :message="error" />
  </div>
</template>
