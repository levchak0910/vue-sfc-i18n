<template>
  <div>
    <p data-testid="about-title">{{ t("about-title") }}</p>
    <p data-testid="team">{{ t("team") }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@vue-sfc-i18n/composable"

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
