<template>
  <Default :lang="lang" :view="view">
    <p data-testid="greeting">{{ t("greeting") }}</p>
    <p data-testid="farewell">{{ t("farewell") }}</p>
  </Default>
</template>

<script setup lang="ts">
import { useI18n } from "@vue-sfc-i18n/composable"
import Default from "../layouts/Default.vue"
import type { View } from "../../../shared/routing"

defineProps<{ lang: string; view: View }>()
const { t } = useI18n()
</script>

<i18n locale="en">
greeting: Hello World
farewell: Goodbye
</i18n>

<i18n locale="hu">
greeting: Helló Világ
farewell: Viszlát
</i18n>
