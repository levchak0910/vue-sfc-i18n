<template>
  <div>
    <p data-testid="greeting">{{ t("greeting", { name: "World" }) }}</p>
    <p data-testid="farewell">{{ t("farewell") }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@vue-sfc-i18n/composable"

const { t } = useI18n()
</script>

<i18n locale="en">
greeting: Hello, {name}!
farewell: Goodbye
</i18n>

<i18n locale="hu">
greeting: Helló, {name}!
farewell: Viszlát
</i18n>
