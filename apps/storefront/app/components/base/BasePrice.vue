<script setup lang="ts">
import type { Cents } from "@nozco/shared-types"
import { computed } from "vue"
import { formatBrl } from "~/lib/money"

const props = defineProps<{
  amount: Cents
  /** The struck-through "from" price of a sale. */
  previous?: boolean
}>()

const formatted = computed(() => formatBrl(props.amount))
</script>

<template>
  <span v-if="previous" class="text-note text-muted-foreground">
    <span class="sr-only">{{ $t("price.previous") }}{{ " " }}</span>
    <s>{{ formatted }}</s>
  </span>
  <span v-else class="text-body font-emphasis">{{ formatted }}</span>
</template>
