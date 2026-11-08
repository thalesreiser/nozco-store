<script setup lang="ts">
import { computed } from "vue"
import type { RouteLocationRaw } from "vue-router"
import { buttonVariants } from "~/components/ui/button"
import { paginationItems } from "~/lib/listing"

const props = defineProps<{
  page: number
  pageCount: number
  pageTo: (page: number) => RouteLocationRaw
}>()

const items = computed(() => paginationItems(props.page, props.pageCount))
const pageClass = (number: number) =>
  buttonVariants({ variant: number === props.page ? "default" : "outline", size: "icon" })
const arrowClass = buttonVariants({ variant: "outline", size: "icon" })
</script>

<template>
  <nav :aria-label="$t('listing.pagination.label')">
    <ul class="flex flex-wrap items-center justify-center gap-2">
      <li v-if="page > 1">
        <NuxtLink :to="pageTo(page - 1)" :class="arrowClass">
          <span aria-hidden="true">&larr;</span>
          <span class="sr-only">{{ $t("listing.pagination.previous") }}</span>
        </NuxtLink>
      </li>
      <li v-for="(number, index) in items" :key="number ?? `gap-${index}`">
        <span v-if="number === null" aria-hidden="true" class="px-1 text-note">&hellip;</span>
        <NuxtLink v-else :to="pageTo(number)" :class="pageClass(number)">
          <span class="sr-only">{{ $t("listing.pagination.page") }}{{ " " }}</span>
          {{ number }}
        </NuxtLink>
      </li>
      <li v-if="page < pageCount">
        <NuxtLink :to="pageTo(page + 1)" :class="arrowClass">
          <span aria-hidden="true">&rarr;</span>
          <span class="sr-only">{{ $t("listing.pagination.next") }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
