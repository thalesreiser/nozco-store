<script setup lang="ts">
import type { StockStatus } from "~/lib/options"

// The status is a prop: the quantity that counts as "low" is a business rule, not this component's.
defineProps<{ status: StockStatus }>()

const styles: Record<StockStatus, string> = {
  in: "bg-secondary text-secondary-foreground",
  low: "bg-primary text-primary-foreground",
  out: "border border-foreground bg-background text-foreground",
}
</script>

<template>
  <span class="inline-block px-2 py-1 text-tag font-action" :class="styles[status]">{{
    $t(`stock.${status}`)
  }}</span>
</template>
