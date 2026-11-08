<script setup lang="ts">
import { ref, useTemplateRef } from "vue"
import { Button } from "~/components/ui/button"
import SearchForm from "./SearchForm.vue"

const open = ref(false)
const toggle = useTemplateRef<{ $el: HTMLElement }>("toggle")
const panel = useTemplateRef<HTMLDivElement>("panel")
const form = useTemplateRef<{ focus: () => void }>("form")

// Shown by hand before the focus: a phone only raises its keyboard for a focus made during the tap
// itself, and v-show would apply a tick later. v-show then writes the same value.
function show() {
  open.value = true
  if (panel.value) panel.value.style.display = ""
  form.value?.focus()
}

function close() {
  if (!open.value) return
  open.value = false
  toggle.value?.$el.focus()
}
</script>

<!-- The panel hangs from the sticky header row, its nearest positioned ancestor. -->
<template>
  <div class="lg:hidden" @keydown.esc="close">
    <Button
      ref="toggle"
      size="icon"
      variant="ghost"
      aria-controls="busca-no-celular"
      :aria-expanded="open"
      :aria-label="$t(open ? 'layout.search.close' : 'layout.search.open')"
      @click="open ? close() : show()"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path v-if="open" d="m5 5 14 14M19 5 5 19" />
        <template v-else>
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 5 5" />
        </template>
      </svg>
    </Button>
    <div
      v-show="open"
      id="busca-no-celular"
      ref="panel"
      class="ground-brand absolute inset-x-0 top-full border-b-3 px-4 py-2 shadow-overlay"
    >
      <SearchForm ref="form" />
    </div>
  </div>
</template>
