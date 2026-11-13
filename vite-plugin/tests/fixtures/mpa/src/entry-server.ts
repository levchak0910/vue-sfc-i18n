import { createI18n, manager } from "@vue-sfc-i18n/composable"
import { createSSRApp, type Component } from "vue"
import { renderToString } from "vue/server-renderer"

import { parsePath } from "../../shared/routing"

export async function render(url: string): Promise<string> {
  const { lang, view } = parsePath(url)
  await manager.loadTranslations(lang)

  async function loadView(): Promise<Component> {
    if (view === "about") return (await import("./views/About.vue")).default
    if (view === "contacts") return (await import("./views/Contacts.vue")).default
    return (await import("./views/Home.vue")).default
  }

  const Page = await loadView()
  const app = createSSRApp(Page, { lang, view })
  app.use(createI18n(lang))

  return renderToString(app)
}
