<script setup lang="ts">
import { useId } from "vue"
import { Button } from "~/components/ui/button"

const inputId = useId()
</script>

<!-- A plain GET form: it works before hydration and adds no script. -->
<template>
  <form role="search" action="/busca" method="get" class="flex items-center">
    <label :for="inputId" class="sr-only">{{ $t("layout.search.label") }}</label>
    <input
      :id="inputId"
      type="search"
      name="q"
      required
      :placeholder="$t('layout.search.placeholder')"
      class="h-touch w-full min-w-0 border border-input bg-background px-3 text-body text-foreground placeholder:text-muted-foreground lg:w-44"
    />
    <Button
      type="submit"
      size="icon"
      variant="secondary"
      class="shrink-0"
      :aria-label="$t('layout.search.submit')"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 5 5" />
      </svg>
    </Button>
  </form>
</template>
