<template>
  <Default :lang="lang" :view="view">
    <p data-testid="greeting">{{ t("greeting", { name: "World" }) }}</p>
    <p data-testid="farewell">{{ t("farewell") }}</p>
    <p data-testid="items-singular">{{ t("N items", 1) }}</p>
    <p data-testid="items-plural">{{ t("N items", 5) }}</p>
    <p data-testid="items-plain-singular">{{ t("items", 1) }}</p>
    <p data-testid="items-plain-plural">{{ t("items", 5) }}</p>
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
greeting: Hello, {name}!
farewell: Goodbye
N items: one item | {n} items
items: item | items
</i18n>

<i18n locale="hu">
greeting: Szia, {name}!
farewell: Viszlát
N items: egy elem | {n} elem
items: elem | elemek
</i18n>
