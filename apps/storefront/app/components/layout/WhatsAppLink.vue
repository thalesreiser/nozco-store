<script setup lang="ts">
import { Button } from "~/components/ui/button"

defineProps<{ href: string }>()
</script>

<template>
  <Button as-child variant="outline">
    <a :href="href" target="_blank" rel="noopener noreferrer">
      {{ $t("layout.whatsApp") }}
      <span class="sr-only">{{ $t("layout.opensInNewTab") }}</span>
    </a>
  </Button>
</template>
