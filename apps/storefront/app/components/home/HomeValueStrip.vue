<template>
  <ul
    :aria-label="$t('home.value.label')"
    class="grid grid-cols-2 gap-stack border-b-2 border-highlight px-page py-4 text-center text-note font-emphasis lg:grid-cols-4"
  >
    <li>{{ $t("home.value.shipping") }}</li>
    <li>{{ $t("home.value.installments") }}</li>
    <li>{{ $t("home.value.exchanges") }}</li>
    <li>{{ $t("home.value.security") }}</li>
  </ul>
</template>
