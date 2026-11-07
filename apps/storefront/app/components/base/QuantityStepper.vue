<script setup lang="ts">
import { computed, useId } from "vue"
import { Button } from "~/components/ui/button"
import FieldError from "./FieldError.vue"

const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min?: number
    max?: number
    disabled?: boolean
    error?: string
  }>(),
  { min: 1, max: Number.POSITIVE_INFINITY, error: undefined },
)
const emit = defineEmits<{ "update:modelValue": [value: number] }>()

const labelId = useId()
const atMin = computed(() => props.modelValue <= props.min)
const atMax = computed(() => props.modelValue >= props.max)

function step(delta: 1 | -1) {
  if (props.disabled || (delta < 0 ? atMin.value : atMax.value)) return
  emit("update:modelValue", props.modelValue + delta)
}
</script>

<template>
  <div class="flex flex-col gap-stack">
    <span :id="labelId" class="text-note font-emphasis">{{ label }}</span>
    <div role="group" :aria-labelledby="labelId" class="flex items-center">
      <!-- At a limit the button stays focusable through aria-disabled: `disabled` would drop keyboard
           focus to the page the moment the limit is reached. -->
      <Button
        variant="outline"
        size="icon"
        type="button"
        :disabled="disabled"
        :aria-disabled="atMin || undefined"
        :aria-label="$t('quantity.decrease')"
        @click="step(-1)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 12h14" />
        </svg>
      </Button>
      <output
        class="min-w-touch text-center text-body font-emphasis"
        :class="{ 'opacity-50': disabled }"
        >{{ modelValue }}</output
      >
      <Button
        variant="outline"
        size="icon"
        type="button"
        :disabled="disabled"
        :aria-disabled="atMax || undefined"
        :aria-label="$t('quantity.increase')"
        @click="step(1)"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Button>
    </div>
    <FieldError v-if="error" :message="error" />
  </div>
</template>
