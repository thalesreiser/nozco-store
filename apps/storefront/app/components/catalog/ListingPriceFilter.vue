<script setup lang="ts">
import type { Cents, StoreProductFacets } from "@nozco/shared-types"
import { useForm } from "vee-validate"
import { useId, useTemplateRef, watch } from "vue"
import { centsToInput, priceFilterSchema } from "#shared/schemas/price-filter"
import type { PriceFilterData, PriceFilterValues } from "#shared/schemas/price-filter"
import BasePrice from "~/components/base/BasePrice.vue"
import FieldError from "~/components/base/FieldError.vue"
import { Button } from "~/components/ui/button"
import { zodTypedSchema } from "~/lib/typed-schema"

const props = defineProps<{
  range: StoreProductFacets["price"]
  min?: Cents
  max?: Cents
}>()
const emit = defineEmits<{ apply: [range: { minPrice?: Cents; maxPrice?: Cents }] }>()

const fromProps = () => ({ min: centsToInput(props.min), max: centsToInput(props.max) })
const { defineField, errors, handleSubmit, resetForm } = useForm<
  PriceFilterValues,
  PriceFilterData
>({
  validationSchema: zodTypedSchema<PriceFilterValues, PriceFilterData>(priceFilterSchema),
  initialValues: fromProps(),
})
const [minInput, minAttrs] = defineField("min")
const [maxInput, maxAttrs] = defineField("max")
watch(
  () => [props.min, props.max],
  () => resetForm({ values: fromProps() }),
)

const minId = useId()
const maxId = useId()
const minField = useTemplateRef<HTMLInputElement>("minField")
const maxField = useTemplateRef<HTMLInputElement>("maxField")

const onSubmit = handleSubmit(
  ({ min, max }) => emit("apply", { minPrice: min, maxPrice: max }),
  ({ errors: invalid }) => (invalid.min ? minField : maxField).value?.focus(),
)
const clear = () => emit("apply", { minPrice: undefined, maxPrice: undefined })
const inputClass = "h-touch w-full border border-input bg-background px-3 text-body text-foreground"
</script>

<template>
  <form novalidate class="flex flex-col gap-stack" @submit="onSubmit">
    <span class="text-note font-emphasis">{{ $t("listing.filters.price") }}</span>
    <p v-if="range" class="text-note text-muted-foreground">
      {{ $t("listing.price.rangeFrom") }} <BasePrice :amount="range.min" />
      {{ $t("listing.price.rangeTo") }} <BasePrice :amount="range.max" />
    </p>
    <div class="grid grid-cols-2 gap-stack">
      <div class="flex flex-col gap-1">
        <label :for="minId" class="text-note">{{ $t("listing.price.min") }}</label>
        <input
          :id="minId"
          ref="minField"
          v-model="minInput"
          v-bind="minAttrs"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :aria-invalid="Boolean(errors.min)"
          :aria-describedby="errors.min ? `${minId}-error` : undefined"
          :class="inputClass"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label :for="maxId" class="text-note">{{ $t("listing.price.max") }}</label>
        <input
          :id="maxId"
          ref="maxField"
          v-model="maxInput"
          v-bind="maxAttrs"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :aria-invalid="Boolean(errors.max)"
          :aria-describedby="errors.max ? `${maxId}-error` : undefined"
          :class="inputClass"
        />
      </div>
    </div>
    <FieldError v-if="errors.min" :id="`${minId}-error`" :message="$t('listing.price.invalid')" />
    <FieldError
      v-if="errors.max"
      :id="`${maxId}-error`"
      :message="$t(errors.max === 'order' ? 'listing.price.order' : 'listing.price.invalid')"
    />
    <div class="flex flex-wrap items-center gap-stack">
      <Button type="submit" variant="outline">
        {{ $t("listing.price.apply") }}
      </Button>
      <Button
        v-if="min !== undefined || max !== undefined"
        type="button"
        variant="link"
        size="sm"
        class="px-0 underline"
        :aria-label="$t('listing.filters.clearNamed', { name: $t('listing.filters.price') })"
        @click="clear"
      >
        {{ $t("listing.filters.clearOne") }}
      </Button>
    </div>
  </form>
</template>
