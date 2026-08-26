<template>
  <div>
    <nav>
      <a data-testid="nav-home" :href="`/${lang}`">Home</a>
      <a data-testid="nav-about" :href="`/${lang}/about`">About</a>
      <a data-testid="nav-contacts" :href="`/${lang}/contacts`">Contacts</a>
    </nav>
    <slot />
    <div>
      <a data-testid="btn-en" :href="langPath('en')">English</a>
      <a data-testid="btn-hu" :href="langPath('hu')">Magyar</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toPath, type View } from "../../../shared/routing"

const props = defineProps<{ lang: string; view: View }>()

function langPath(newLang: string): string {
  return toPath(props.view, newLang)
}
</script>
