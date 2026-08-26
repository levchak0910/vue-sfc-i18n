import { createApp } from "vue"
import { manager } from "@vue-sfc-i18n/composable"
import { parsePath } from "../../shared/routing"

const { lang, view } = parsePath(window.location.pathname)
await manager.loadTranslations(lang)

const { default: App } = await import("./App.vue")
createApp(App, { lang, view }).mount("#app")
