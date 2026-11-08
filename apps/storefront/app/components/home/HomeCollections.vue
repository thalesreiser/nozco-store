<script setup lang="ts">
import BaseSkeleton from "~/components/base/BaseSkeleton.vue"
import ErrorState from "~/components/base/ErrorState.vue"
import { Button } from "~/components/ui/button"
import type { MenuLink } from "~/composables/useCatalogMenu"

defineProps<{
  links: MenuLink[]
  pending: boolean
  failed: boolean
}>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <!-- A store without collections has nothing to say here, so the whole block stays out. -->
  <section
    v-if="failed || pending || links.length > 0"
    aria-labelledby="home-collections"
    class="px-page py-section"
  >
    <h2 id="home-collections" class="mb-4 text-heading uppercase">
      {{ $t("home.collections.title") }}
    </h2>
    <ErrorState v-if="failed" heading-level="h3" :title="$t('home.collections.error')">
      <Button type="button" @click="$emit('retry')">
        {{ $t("home.retry") }}
      </Button>
    </ErrorState>
    <div
      v-else-if="pending"
      role="status"
      :aria-label="$t('state.loading')"
      class="grid gap-stack lg:grid-cols-3"
    >
      <BaseSkeleton v-for="slot in 3" :key="slot" class="h-28 lg:h-44" />
    </div>
    <ul v-else class="grid gap-stack lg:grid-cols-3">
      <li v-for="link in links" :key="link.to">
        <NuxtLink
          :to="link.to"
          class="ground-brand flex h-28 items-end p-4 font-display text-heading font-heavy uppercase underline-offset-4 hover:underline lg:h-44"
        >
          {{ link.label }}
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
