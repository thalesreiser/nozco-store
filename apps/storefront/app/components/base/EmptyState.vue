<script setup lang="ts">
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
  <div class="flex flex-col items-start gap-stack py-section">
    <component :is="headingLevel" class="font-display text-heading font-heavy uppercase">
      {{ title }}
    </component>
    <p v-if="description" class="text-body text-muted-foreground">
      {{ description }}
    </p>
    <slot />
  </div>
</template>
