<script setup lang="ts">
import type { StoreInfo } from "~/composables/useStoreInfo"
import WhatsAppLink from "./WhatsAppLink.vue"

defineProps<{ storeInfo: StoreInfo }>()

const helpLinks = [
  { key: "layout.footer.faq", to: "/institucional/faq" },
  { key: "layout.footer.about", to: "/institucional/sobre" },
  { key: "layout.footer.contact", to: "/institucional/contato" },
]
const linkClass = "flex min-h-touch items-center text-link underline hover:text-link-hover"
</script>

<template>
  <footer class="ground-brand flex flex-col gap-section px-4 py-section lg:px-page">
    <div class="grid gap-section md:grid-cols-2 lg:grid-cols-4 lg:gap-grid">
      <section class="flex flex-col gap-stack" aria-labelledby="rodape-newsletter">
        <h2 id="rodape-newsletter" class="text-lead uppercase">
          {{ $t("layout.newsletter.title") }}
        </h2>
        <!-- VeeValidate and Zod add 34 KB gzip: this keeps them from running before the footer is seen. -->
        <LazyLayoutNewsletterForm hydrate-on-visible />
      </section>

      <nav class="flex flex-col gap-stack" aria-labelledby="rodape-ajuda">
        <h2 id="rodape-ajuda" class="text-lead uppercase">
          {{ $t("layout.footer.help") }}
        </h2>
        <ul>
          <li v-for="link in helpLinks" :key="link.to">
            <NuxtLink :to="link.to" :class="linkClass">{{ $t(link.key) }}</NuxtLink>
          </li>
        </ul>
        <WhatsAppLink
          v-if="storeInfo.whatsAppUrl"
          :href="storeInfo.whatsAppUrl"
          class="self-start"
        />
      </nav>

      <nav
        v-if="storeInfo.socialLinks.length"
        class="flex flex-col gap-stack"
        aria-labelledby="rodape-redes"
      >
        <h2 id="rodape-redes" class="text-lead uppercase">
          {{ $t("layout.footer.social") }}
        </h2>
        <ul>
          <li v-for="link in storeInfo.socialLinks" :key="link.url">
            <a :href="link.url" target="_blank" rel="noopener noreferrer" :class="linkClass">
              {{ link.name }}
              <span class="sr-only">{{ $t("layout.opensInNewTab") }}</span>
            </a>
          </li>
        </ul>
      </nav>

      <section
        v-if="storeInfo.paymentMethods.length"
        class="flex flex-col gap-stack"
        aria-labelledby="rodape-pagamento"
      >
        <h2 id="rodape-pagamento" class="text-lead uppercase">
          {{ $t("layout.footer.payment") }}
        </h2>
        <ul>
          <li v-for="method in storeInfo.paymentMethods" :key="method">
            {{ method }}
          </li>
        </ul>
      </section>
    </div>

    <div
      v-if="
        storeInfo.legalName || storeInfo.cnpj || storeInfo.legalAddress || storeInfo.contactEmail
      "
      data-testid="legal-data"
      class="flex flex-col gap-1 border-t pt-stack text-note"
    >
      <p v-if="storeInfo.legalName">
        {{ storeInfo.legalName }}
      </p>
      <p v-if="storeInfo.cnpj">
        {{ $t("layout.footer.cnpj", { cnpj: storeInfo.cnpj }) }}
      </p>
      <p v-if="storeInfo.legalAddress">
        {{ storeInfo.legalAddress }}
      </p>
      <a
        v-if="storeInfo.contactEmail"
        :href="`mailto:${storeInfo.contactEmail}`"
        :class="[linkClass, 'self-start']"
      >
        {{ storeInfo.contactEmail }}
      </a>
    </div>
  </footer>
</template>
