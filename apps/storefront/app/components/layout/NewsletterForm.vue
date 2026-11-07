<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef, watch } from "vue"
import { useForm } from "vee-validate"
import { newsletterSchema } from "#shared/schemas/newsletter"
import type { NewsletterData } from "#shared/schemas/newsletter"
import FieldError from "~/components/base/FieldError.vue"
import { Button } from "~/components/ui/button"
import { zodTypedSchema } from "~/lib/typed-schema"

interface NewsletterValues {
  email: string
  consent: boolean
}

// No provider or consent decision exists yet, so a valid form only says that nothing was sent. The
// inputs have no `name` on purpose: a native submit before hydration cannot put the e-mail in the URL.
const { defineField, errors, handleSubmit } = useForm<NewsletterValues, NewsletterData>({
  validationSchema: zodTypedSchema<NewsletterValues, NewsletterData>(newsletterSchema),
  initialValues: { email: "", consent: false },
})
const [email, emailAttrs] = defineField("email")
const [consent, consentAttrs] = defineField("consent")

const emailId = useId()
const consentId = useId()
const emailInput = useTemplateRef<HTMLInputElement>("emailInput")
const consentInput = useTemplateRef<HTMLInputElement>("consentInput")
const notSent = ref(false)
const hydrated = ref(false)
onMounted(() => (hydrated.value = true))
watch([email, consent], () => (notSent.value = false))

const onSubmit = handleSubmit(
  () => {
    notSent.value = true
  },
  ({ errors: invalid }) => {
    notSent.value = false
    const firstInvalid = invalid.email ? emailInput : consentInput
    firstInvalid.value?.focus()
  },
)
</script>

<template>
  <form novalidate class="flex flex-col gap-stack" :data-hydrated="hydrated" @submit="onSubmit">
    <div class="flex flex-col gap-1">
      <label :for="emailId" class="text-note font-emphasis">
        {{ $t("layout.newsletter.email") }}
      </label>
      <input
        :id="emailId"
        ref="emailInput"
        v-model="email"
        v-bind="emailAttrs"
        type="email"
        autocomplete="email"
        :aria-invalid="Boolean(errors.email)"
        :aria-describedby="errors.email ? `${emailId}-error` : undefined"
        class="h-touch w-full border border-input bg-background px-3 text-body text-foreground"
      />
      <FieldError
        v-if="errors.email"
        :id="`${emailId}-error`"
        :message="$t('layout.newsletter.emailError')"
      />
    </div>
    <div class="flex flex-col gap-1">
      <label :for="consentId" class="flex min-h-touch items-center gap-2 text-note">
        <input
          :id="consentId"
          ref="consentInput"
          v-model="consent"
          v-bind="consentAttrs"
          type="checkbox"
          :aria-invalid="Boolean(errors.consent)"
          :aria-describedby="errors.consent ? `${consentId}-error` : undefined"
          class="size-5 shrink-0"
        />
        {{ $t("layout.newsletter.consent") }}
      </label>
      <FieldError
        v-if="errors.consent"
        :id="`${consentId}-error`"
        :message="$t('layout.newsletter.consentError')"
      />
    </div>
    <Button type="submit" class="self-start">
      {{ $t("layout.newsletter.submit") }}
    </Button>
    <p role="status" class="text-note">
      <template v-if="notSent">
        {{ $t("layout.newsletter.notSent") }}
      </template>
    </p>
  </form>
</template>
