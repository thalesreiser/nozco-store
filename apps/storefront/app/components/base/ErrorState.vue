<script setup lang="ts">
import AlertIcon from "./AlertIcon.vue"

withDefaults(
  defineProps<{
    title: string
    description?: string
    headingLevel?: "h2" | "h3" | "h4"
  }>(),
  { description: undefined, headingLevel: "h2" },
)
</script>

<template>
  <div role="alert" class="flex flex-col items-start gap-stack bg-error-surface p-grid text-error">
    <component :is="headingLevel" class="flex items-center gap-2 font-sans text-lead font-action">
      <AlertIcon />
      {{ title }}
    </component>
    <p v-if="description" class="text-body">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
