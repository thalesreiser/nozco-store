<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "reka-ui"
import type { MenuLink } from "~/composables/useCatalogMenu"
import { Button } from "~/components/ui/button"
import SearchForm from "./SearchForm.vue"
import WhatsAppLink from "./WhatsAppLink.vue"

defineProps<{ links: MenuLink[]; whatsAppUrl: string | null }>()

const open = ref(false)

// The menu only exists below this width, so a rotated tablet must not stay trapped in it.
let wide: MediaQueryList | undefined
const closeWhenWide = (event: MediaQueryListEvent) => {
  if (event.matches) open.value = false
}
onMounted(() => {
  wide = globalThis.matchMedia("(min-width: 64rem)")
  wide.addEventListener("change", closeWhenWide)
})
onBeforeUnmount(() => wide?.removeEventListener("change", closeWhenWide))

const linkClass = "flex min-h-touch items-center text-lead font-emphasis text-link"
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child>
      <Button size="icon" variant="ghost" :aria-label="$t('layout.menu.open')">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </Button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="ground-brand fixed inset-0 z-40" />
      <DialogContent
        :aria-describedby="undefined"
        class="ground-brand fixed inset-0 z-50 flex flex-col gap-section overflow-y-auto px-4 py-2"
      >
        <div class="flex items-center justify-between">
          <DialogTitle class="text-note font-action tracking-label">
            {{ $t("layout.menu.title") }}
          </DialogTitle>
          <DialogClose as-child>
            <Button size="icon" variant="ghost" :aria-label="$t('layout.menu.close')">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m5 5 14 14M19 5 5 19" />
              </svg>
            </Button>
          </DialogClose>
        </div>
        <SearchForm />
        <nav :aria-label="$t('layout.menu.navLabel')">
          <ul class="flex flex-col">
            <li v-for="link in links" :key="link.to">
              <NuxtLink :to="link.to" :class="linkClass" @click="open = false">
                {{ link.label }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/institucional/faq" :class="linkClass" @click="open = false">
                {{ $t("layout.footer.faq") }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <WhatsAppLink v-if="whatsAppUrl" :href="whatsAppUrl" class="self-start" />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
