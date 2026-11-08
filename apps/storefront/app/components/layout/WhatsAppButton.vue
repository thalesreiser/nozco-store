<script setup lang="ts">
import { Button } from "~/components/ui/button"

defineProps<{ href: string }>()
</script>

<!-- Stacking: z-20 stays under the sticky header row (z-30) and every dialog or drawer (z-40, z-50).
     The white outline keeps the black button visible over the black header and footer. -->
<template>
  <aside
    :aria-label="$t('layout.contactLabel')"
    class="ground-store fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20"
  >
    <Button
      as-child
      size="icon"
      class="border-2 border-primary-foreground shadow-overlay [&_svg]:size-6"
    >
      <a :href="href" target="_blank" rel="noopener">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.59-.48-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2-1.42.25-.69.25-1.29.18-1.41-.08-.12-.27-.2-.57-.35m-5.42 7.4h-.01a9.87 9.87 0 0 1-5.03-1.37l-.36-.22-3.74.99 1-3.65-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 7c0 5.44-4.44 9.87-9.88 9.87m8.41-18.29A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.69 1.45c6.55 0 11.89-5.34 11.89-11.9a11.82 11.82 0 0 0-3.48-8.4z"
          />
        </svg>
        <span class="sr-only">{{ $t("layout.whatsApp") }} {{ $t("layout.opensInNewTab") }}</span>
      </a>
    </Button>
  </aside>
</template>
