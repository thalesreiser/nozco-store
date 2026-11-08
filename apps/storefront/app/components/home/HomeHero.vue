<script setup lang="ts">
import type { StoreHomeBanner } from "@nozco/shared-types"
import { computed, ref, watch } from "vue"
import BarbedWire from "~/components/base/BarbedWire.vue"
import { Button } from "~/components/ui/button"

const props = defineProps<{ banners: StoreHomeBanner[] }>()

const index = ref(0)
watch(
  () => props.banners.length,
  () => (index.value = 0),
)
const current = computed(() => props.banners[index.value] ?? null)
const isCarousel = computed(() => props.banners.length > 1)

/** Moves only when asked, with no timer and no animation, so there is no motion to reduce. */
function move(step: 1 | -1) {
  const total = props.banners.length
  index.value = (index.value + step + total) % total
}
</script>

<template>
  <!-- One slide in the page at a time, so the title is always the page's only h1, also without JS. -->
  <section
    :aria-label="$t('home.hero.label')"
    :aria-roledescription="isCarousel ? $t('home.hero.carousel') : undefined"
    class="hero ground-brand relative overflow-hidden border-t-2 border-highlight"
  >
    <template v-if="current?.image_url">
      <img
        :key="current.id"
        :src="current.image_url"
        :alt="current.image_alt"
        fetchpriority="high"
        class="absolute inset-0 size-full object-cover"
      />
      <div class="absolute inset-0 bg-background/60" />
    </template>
    <div
      class="relative flex min-h-72 flex-col items-center justify-center gap-stack px-page py-hero text-center lg:min-h-96"
    >
      <BarbedWire class="hero-wire w-56 max-w-full text-sheen lg:w-110" />
      <h1 class="text-display uppercase">
        {{ current?.title ?? $t("home.title") }}
      </h1>
      <Button v-if="current?.cta_url && current.cta_label" as-child size="lg">
        <NuxtLink :to="current.cta_url">{{ current.cta_label }}</NuxtLink>
      </Button>
      <div v-if="isCarousel" class="flex items-center gap-stack">
        <Button
          type="button"
          size="icon"
          variant="outline"
          :aria-label="$t('home.hero.previous')"
          @click="move(-1)"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11 1 3 8l8 7z" />
          </svg>
        </Button>
        <p aria-live="polite" class="text-note">
          {{ $t("home.hero.position", { current: index + 1, total: banners.length }) }}
        </p>
        <Button
          type="button"
          size="icon"
          variant="outline"
          :aria-label="$t('home.hero.next')"
          @click="move(1)"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
            <path d="m5 1 8 7-8 7z" />
          </svg>
        </Button>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* ADR 010: the silver glow behind the wire. Same values as the approved mock-up. */
.hero {
  background-image: radial-gradient(
    55% 60% at 50% 28%,
    color-mix(in srgb, var(--sheen) 15%, transparent),
    transparent 72%
  );
}

.hero-wire {
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--sheen) 40%, transparent));
}
</style>
