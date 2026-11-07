<script setup lang="ts">
import { computed } from "vue"
import { setResponseStatus, useHead, useI18n, useRequestEvent, useRoute } from "#imports"
import ListingView from "~/components/catalog/ListingView.vue"
import { useProductListing } from "~/composables/useProductListing"
import type { ListingScope } from "~/lib/listing"

const route = useRoute()
const scope = computed<ListingScope>(() => ({ collection_handle: String(route.params.slug) }))

const listing = useProductListing(scope)
const { state, data, facets, scopeName, loading, failed, pageTo, update, clearFilters, retry } =
  listing
await listing.ready

const event = useRequestEvent()
if (event && data.value && !data.value.scopeHasProducts) setResponseStatus(event, 404)

const { t } = useI18n()
const title = computed(() => scopeName.value ?? t("listing.collectionFallback"))
useHead({ title })
</script>

<template>
  <ListingView
    :title="title"
    :state="state"
    :facets="facets"
    :products="data?.products ?? []"
    :count="data?.count ?? 0"
    :loading="loading"
    :failed="failed"
    :page-to="pageTo"
    @change="update"
    @clear="clearFilters"
    @retry="retry"
  />
</template>
