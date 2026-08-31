import type { Page } from "@playwright/test"
import { parseTranslations } from "./parse"
import { pageSettled } from "./page"

export type Mode = "dev" | "prod"

type Strategy = {
  isTranslation: (url: string) => boolean
  matchesEntry: (url: string, entry: string) => boolean
  parse: (body: string) => Record<string, string>
  viewLoaded: (urls: string[], view: string) => boolean
  langLoaded: (urls: string[], lang: string) => boolean
}

const strategies: Record<Mode, Strategy> = {
  dev: {
    isTranslation: url => url.includes("__x00__virtual:i18n"),
    matchesEntry: (url, entry) => url.includes(`__x00__virtual:i18n/entry/${entry}`),
    parse: parseTranslations,
    viewLoaded: (urls, view) => urls.some(u => u.includes(`__x00__virtual:i18n/entry/views-${view}`)),
    langLoaded: (urls, lang) => urls.some(u => u.includes("__x00__virtual:i18n/entry") && u.endsWith(`/${lang}`)),
  },
  prod: {
    isTranslation: url => /\/assets\/[a-z]{2}-[^.]+\.js/.test(url),
    matchesEntry: (url, entry) => {
      const lang = entry.split("/").pop() ?? "en"
      return new RegExp(`/assets/${lang}-[^.]+\\.js`).test(url)
    },
    parse: parseTranslations,
    viewLoaded: (urls, view) => {
      const name = view.charAt(0).toUpperCase() + view.slice(1)
      return urls.some(u => new RegExp(`/assets/${name}-[^.]+\\.js`).test(u))
    },
    langLoaded: (urls, lang) => urls.some(u => new RegExp(`/assets/${lang}-[^.]+\\.js`).test(u)),
  },
}

export function collectTranslations(
  mode: Mode,
  page: Page,
  entry?: string,
): () => Promise<Record<string, string>> {
  const s = strategies[mode]
  if (entry) {
    const p = page.waitForResponse(r => s.matchesEntry(r.url(), entry))
    return async () => s.parse(await (await p).text())
  }
  const pending: Promise<string>[] = []
  page.on("response", r => {
    if (s.isTranslation(r.url())) pending.push(r.text())
  })
  return async () => {
    await pageSettled(page)
    const bodies = await Promise.all(pending)
    return bodies.reduce<Record<string, string>>((acc, b) => ({ ...acc, ...s.parse(b) }), {})
  }
}

export function trackLoaded(
  mode: Mode,
  page: Page,
): () => { hasView: (view: string) => boolean; hasLang: (lang: string) => boolean } {
  const s = strategies[mode]
  const urls: string[] = []
  page.on("request", req => urls.push(req.url()))
  return () => ({
    hasView: view => s.viewLoaded(urls, view),
    hasLang: lang => s.langLoaded(urls, lang),
  })
}
