import { manager } from "@vue-sfc-i18n/composable"
import { createSSRApp, type Component } from "vue"

import { parsePath } from "../../shared/routing"

const { lang, view } = parsePath(window.location.pathname)
await manager.loadTranslations(lang)

async function loadView(): Promise<Component> {
  if (view === "about") return (await import("./views/About.vue")).default
  if (view === "contacts") return (await import("./views/Contacts.vue")).default
  return (await import("./views/Home.vue")).default
}

const Page = await loadView()
createSSRApp(Page, { lang, view }).mount("#app")
