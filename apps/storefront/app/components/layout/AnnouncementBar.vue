<script setup lang="ts">
import type { StoreHomeAnnouncement } from "@nozco/shared-types"

defineProps<{ announcement: StoreHomeAnnouncement }>()
</script>

<template>
  <p class="ground-store px-4 py-2 text-center text-note font-action tracking-label lg:px-page">
    <NuxtLink
      v-if="announcement.link_url"
      :to="announcement.link_url"
      class="inline-flex min-h-touch min-w-touch items-center underline underline-offset-4"
    >
      {{ announcement.message }}
    </NuxtLink>
    <template v-else>
      {{ announcement.message }}
    </template>
  </p>
</template>
