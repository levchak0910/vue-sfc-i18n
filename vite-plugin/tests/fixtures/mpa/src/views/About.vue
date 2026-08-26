<template>
  <Default :lang="lang" :view="view">
    <p data-testid="about-title">{{ t("about-title") }}</p>
    <p data-testid="team">{{ t("team") }}</p>
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
about-title: About Us
team: Our Team
</i18n>

<i18n locale="hu">
about-title: Rólunk
team: Csapatunk
</i18n>
