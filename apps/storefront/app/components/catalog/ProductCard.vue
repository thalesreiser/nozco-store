<script setup lang="ts">
import type { Cents } from "@nozco/shared-types"
import BasePrice from "~/components/base/BasePrice.vue"
import StockBadge from "~/components/base/StockBadge.vue"
import { Button } from "~/components/ui/button"
import type { StockStatus } from "~/lib/options"

withDefaults(
  defineProps<{
    name: string
    to: string
    price: Cents
    /** The "from" price of a sale. */
    compareAt?: Cents | null
    /** The line under the name, such as the installments. Its rule is open (Q-05), so it is plain text. */
    note?: string
    /** A tag on the photo, such as a discount. "Out of stock" always replaces it. */
    badge?: string
    stock?: StockStatus
    imageSrc?: string
    /** Empty by default: the name next to the photo already says what it shows. */
    imageAlt?: string
  }>(),
  {
    compareAt: null,
    note: undefined,
    badge: undefined,
    stock: "in",
    imageSrc: undefined,
    imageAlt: "",
  },
)
defineEmits<{ buy: [] }>()
</script>

<template>
  <article class="@container flex flex-col gap-stack">
    <!-- The link stretches over this block, so the photo and the prices are one big touch target. -->
    <div class="relative flex flex-1 flex-col gap-stack">
      <div
        class="relative flex aspect-product items-center justify-center bg-muted text-foreground"
      >
        <img
          v-if="imageSrc"
          :src="imageSrc"
          :alt="imageAlt"
          loading="lazy"
          class="size-full object-cover"
        />
        <svg
          v-else
          aria-hidden="true"
          viewBox="0 0 120 120"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="size-1/2"
        >
          <path d="M42 18 18 32l8 22 12-5v53h44V49l12 5 8-22-24-14c-3 9-9 13-18 13s-15-4-18-13Z" />
        </svg>
        <div class="absolute top-2 left-2 @2xs:top-3 @2xs:left-3">
          <StockBadge v-if="stock === 'out'" status="out" />
          <span
            v-else-if="badge"
            class="inline-block px-2 py-1 text-tag font-action"
            :class="
              compareAt
                ? 'bg-highlight text-highlight-foreground'
                : 'bg-primary text-primary-foreground'
            "
            >{{ badge }}</span
          >
          <StockBadge v-else-if="stock === 'low'" status="low" />
        </div>
      </div>
      <!-- Name and price only share a row when the card is wide enough; two per row on a phone is not. -->
      <div
        class="flex flex-col gap-1 @2xs:flex-row @2xs:items-baseline @2xs:justify-between @2xs:gap-4"
      >
        <NuxtLink
          :to="to"
          class="text-body font-emphasis underline-offset-4 after:absolute after:inset-0 hover:underline"
        >
          {{ name }}
        </NuxtLink>
        <BasePrice :amount="price" />
      </div>
      <div
        v-if="note || compareAt"
        class="flex flex-col gap-1 text-note text-muted-foreground @2xs:flex-row @2xs:items-baseline @2xs:justify-between @2xs:gap-4"
      >
        <span v-if="note">{{ note }}</span>
        <BasePrice v-if="compareAt" :amount="compareAt" previous />
      </div>
    </div>
    <Button
      size="lg"
      type="button"
      class="px-2 @2xs:px-8"
      :disabled="stock === 'out'"
      :aria-label="$t('product.buyNamed', { name })"
      @click="$emit('buy')"
    >
      {{ $t("product.buy") }}
    </Button>
  </article>
</template>
