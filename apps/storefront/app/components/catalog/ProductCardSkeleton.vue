<script setup lang="ts">
import BaseSkeleton from "~/components/base/BaseSkeleton.vue"
</script>

<template>
  <div role="status" :aria-label="$t('state.loading')" class="flex flex-col gap-stack">
    <BaseSkeleton class="h-64" />
    <BaseSkeleton class="h-6 w-2/3" />
    <BaseSkeleton class="h-5 w-1/2" />
    <BaseSkeleton class="h-12" />
  </div>
</template>
