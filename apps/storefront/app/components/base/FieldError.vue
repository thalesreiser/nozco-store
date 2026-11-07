<script setup lang="ts">
import AlertIcon from "./AlertIcon.vue"

defineProps<{ message: string }>()
</script>

<template>
  <p role="alert" class="flex items-center gap-2 text-note font-emphasis text-error">
    <AlertIcon />
    {{ message }}
  </p>
</template>
