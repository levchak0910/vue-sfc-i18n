<template>
  <div>
    <nav>
      <button data-testid="nav-home" @click="navigate('home')">Home</button>
      <button data-testid="nav-about" @click="navigate('about')">About</button>
      <button data-testid="nav-contacts" @click="navigate('contacts')">Contacts</button>
    </nav>
    <Home v-if="view === 'home'" />
    <About v-if="view === 'about'" />
    <Contacts v-if="view === 'contacts'" />
    <div>
      <button data-testid="btn-en" @click="loadLang('en')">English</button>
      <button data-testid="btn-hu" @click="loadLang('hu')">Magyar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { manager } from "@vue-sfc-i18n/composable"
import { defineAsyncComponent, onMounted, onUnmounted, ref } from "vue"

import { parsePath, toPath, type View } from "../../shared/routing"

const Home = defineAsyncComponent(() => import("./views/Home.vue"))
const About = defineAsyncComponent(() => import("./views/About.vue"))
const Contacts = defineAsyncComponent(() => import("./views/Contacts.vue"))

const props = defineProps<{ lang: string; view: View }>()

const lang = ref(props.lang)
const view = ref<View>(props.view)

function navigate(page: View): void {
  history.pushState(null, "", toPath(page, lang.value))
  view.value = page
}

function onPopState(): void {
  const parsed = parsePath(window.location.pathname)
  lang.value = parsed.lang
  view.value = parsed.view
}

onMounted(() => window.addEventListener("popstate", onPopState))
onUnmounted(() => window.removeEventListener("popstate", onPopState))

async function loadLang(newLang: string): Promise<void> {
  lang.value = newLang
  history.replaceState(null, "", toPath(view.value, newLang))
  await manager.loadTranslations(newLang)
}
</script>
