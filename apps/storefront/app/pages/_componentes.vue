<script setup lang="ts">
import { ref } from "vue"
import { createError, useRuntimeConfig, useSeoMeta } from "#imports"
import { GALLERY_MARKER, isGalleryAllowedIn } from "#shared/gallery"
import BasePrice from "~/components/base/BasePrice.vue"
import BaseSkeleton from "~/components/base/BaseSkeleton.vue"
import EmptyState from "~/components/base/EmptyState.vue"
import ErrorState from "~/components/base/ErrorState.vue"
import QuantityStepper from "~/components/base/QuantityStepper.vue"
import StockBadge from "~/components/base/StockBadge.vue"
import ColourSwatch from "~/components/catalog/ColourSwatch.vue"
import ProductCard from "~/components/catalog/ProductCard.vue"
import ProductCardSkeleton from "~/components/catalog/ProductCardSkeleton.vue"
import SizeSelector from "~/components/catalog/SizeSelector.vue"
import { Button } from "~/components/ui/button"
import type { SelectableOption } from "~/lib/options"

// Internal review page. nuxt.config.ts leaves it out of production builds; this second check covers a
// preview build started with production settings.
if (!isGalleryAllowedIn(useRuntimeConfig().public.appEnv)) {
  throw createError({ statusCode: 404, fatal: true })
}
useSeoMeta({ robots: "noindex, nofollow" })

const grounds = [
  { id: "store", className: "ground-store", title: "[Fundo branco: loja]" },
  { id: "brand", className: "ground-brand", title: "[Fundo preto: marca]" },
]
const buttonVariants = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const
const buttonSizes = ["sm", "default", "lg"] as const

// Examples only: the size grid is open (Q-03), and every name and price is invented.
const sizes: SelectableOption[] = [
  { value: "p", label: "[P]" },
  { value: "m", label: "[M]" },
  { value: "g", label: "[G]", available: false },
  { value: "gg", label: "[GG]" },
]
const colours: SelectableOption[] = [
  { value: "cor-1", label: "[Cor 1]", fill: "var(--foreground)" },
  { value: "cor-2", label: "[Cor 2]", fill: "var(--background)" },
  { value: "cor-3", label: "[Cor 3]", fill: "var(--input)", available: false },
  { value: "cor-4", label: "[Cor 4, sem amostra]" },
]
const stockStatuses = ["in", "low", "out"] as const

const size = ref("m")
const colour = ref("cor-1")
const quantity = ref(1)
</script>

<template>
  <main :data-gallery="GALLERY_MARKER">
    <div class="ground-brand px-4 py-section md:px-page">
      <h1 class="text-heading uppercase">[Componentes]</h1>
    </div>
    <div
      v-for="ground in grounds"
      :key="ground.id"
      :class="ground.className"
      :data-ground="ground.id"
      class="flex flex-col gap-section px-4 py-section md:px-page"
    >
      <h2 class="text-heading uppercase">
        {{ ground.title }}
      </h2>

      <section data-component="button" class="flex flex-col gap-stack">
        <h3 class="text-lead">Button</h3>
        <div
          v-for="variant in buttonVariants"
          :key="variant"
          class="flex flex-wrap items-center gap-2"
        >
          <Button
            v-for="buttonSize in buttonSizes"
            :key="buttonSize"
            :variant="variant"
            :size="buttonSize"
          >
            [{{ variant }} {{ buttonSize }}]
          </Button>
          <Button :variant="variant" disabled> [{{ variant }} desativado] </Button>
        </div>
      </section>

      <section data-component="price" class="flex flex-col gap-stack">
        <h3 class="text-lead">Price</h3>
        <div class="flex flex-wrap items-baseline gap-4">
          <BasePrice :amount="8990" />
          <BasePrice :amount="12990" previous />
          <BasePrice :amount="123456" />
        </div>
      </section>

      <section data-component="skeleton" class="flex flex-col gap-stack">
        <h3 class="text-lead">Skeleton</h3>
        <BaseSkeleton class="h-6 w-2/3" />
        <BaseSkeleton class="h-24" />
      </section>

      <section data-component="empty-state" class="flex flex-col gap-stack">
        <h3 class="text-lead">EmptyState</h3>
        <EmptyState
          title="[Título do estado vazio]"
          description="[Texto do estado vazio]"
          heading-level="h4"
        >
          <Button>[Ação]</Button>
        </EmptyState>
      </section>

      <section data-component="error-state" class="flex flex-col gap-stack">
        <h3 class="text-lead">ErrorState</h3>
        <ErrorState title="[Título do erro]" description="[Texto do erro]" heading-level="h4">
          <Button variant="outline"> [Tentar de novo] </Button>
        </ErrorState>
      </section>

      <section data-component="quantity-stepper" class="flex flex-col gap-stack">
        <h3 class="text-lead">QuantityStepper</h3>
        <div class="flex flex-wrap items-start gap-inline">
          <QuantityStepper v-model="quantity" label="[Quantidade, de 1 a 3]" :max="3" />
          <QuantityStepper :model-value="2" label="[Desativado]" disabled />
          <QuantityStepper :model-value="1" label="[Com erro]" error="[Mensagem de erro]" />
        </div>
      </section>

      <section data-component="stock-badge" class="flex flex-col gap-stack">
        <h3 class="text-lead">StockBadge</h3>
        <div class="flex flex-wrap gap-2">
          <StockBadge v-for="status in stockStatuses" :key="status" :status="status" />
        </div>
      </section>

      <section data-component="size-selector" class="flex flex-col gap-stack">
        <h3 class="text-lead">SizeSelector</h3>
        <SizeSelector v-model="size" label="[Tamanho]" :options="sizes" />
        <SizeSelector label="[Sem escolha, com erro]" :options="sizes" error="[Mensagem de erro]" />
        <SizeSelector model-value="m" label="[Desativado]" :options="sizes" disabled />
      </section>

      <section data-component="colour-swatch" class="flex flex-col gap-stack">
        <h3 class="text-lead">ColourSwatch</h3>
        <ColourSwatch v-model="colour" label="[Cor]" :options="colours" />
        <ColourSwatch
          label="[Sem escolha, com erro]"
          :options="colours"
          error="[Mensagem de erro]"
        />
        <ColourSwatch model-value="cor-1" label="[Desativado]" :options="colours" disabled />
      </section>

      <section data-component="product-card" class="flex flex-col gap-stack">
        <h3 class="text-lead">ProductCard</h3>
        <div class="grid gap-grid sm:grid-cols-2 lg:grid-cols-3">
          <ProductCard
            name="Estampa 01"
            to="#estampa-01"
            :price="8990"
            :compare-at="12990"
            note="[PARCELAMENTO]"
            badge="[% OFF]"
          />
          <ProductCard name="Estampa 02" to="#estampa-02" :price="8990" badge="Novidade" />
          <ProductCard name="Estampa 03" to="#estampa-03" :price="8990" stock="low" />
          <ProductCard name="Estampa 04" to="#estampa-04" :price="8990" stock="out" />
          <ProductCardSkeleton />
        </div>
      </section>
    </div>
  </main>
</template>
