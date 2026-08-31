<template>
  <Default :lang="lang" :view="view">
    <h2 data-testid="contacts-title">{{ t("contacts-title") }}</h2>
    <p data-testid="contacts-email">{{ t("contacts-email") }}</p>
  </Default>
</template>

<script setup lang="ts">
import { useI18n } from "@vue-sfc-i18n/composable"

import type { View } from "../../../shared/routing"
import Default from "../layouts/Default.vue"

defineProps<{ lang: string; view: View }>()
const { t } = useI18n()
</script>

<i18n locale="en">
contacts-title: Contact Us
contacts-email: Email us at hello@example.com
</i18n>

<i18n locale="hu">
contacts-title: Kapcsolat
contacts-email: Írjon nekünk a e-mail cimre hello@example.com
</i18n>
