import { beforeEach, describe, expect, it, vi } from "vitest"
import type { VNode } from "vue"

// Two schemas with disjoint keys make `t` accept any key with optional params
declare module "./index" {
  interface I18nSchema {
    "a.ts": Record<string, string>
    "b.ts": Record<never, never>
  }
}

type Mod = typeof import("./index")
type Vue = typeof import("vue")
type ServerRenderer = typeof import("vue/server-renderer")

let useI18n: Mod["useI18n"]
let createI18n: Mod["createI18n"]
let manager: Mod["manager"]
let vue: Vue
let serverRenderer: ServerRenderer

const DICTIONARIES: Record<string, Record<string, string>> = {
  en: { foo: "Foo" },
  hu: { foo: "Fóö" },
  uk: { foo: "Фуу" },
}

const loadDictionary = async (language: string) => DICTIONARIES[language] ?? {}

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

beforeEach(async () => {
  vi.resetModules()
  vue = await import("vue")
  serverRenderer = await import("vue/server-renderer")
  const mod: Mod = await import("./index")
  useI18n = mod.useI18n
  createI18n = mod.createI18n
  manager = mod.manager
})

const renderWith = (setup: () => () => VNode, language?: string) => {
  const app = vue.createSSRApp(vue.defineComponent({ setup }))
  if (language !== undefined) app.use(createI18n(language))
  return serverRenderer.renderToString(app)
}

const createPage = (language: string, waitMs: number) => {
  const Page = vue.defineComponent({
    async setup() {
      const { t } = useI18n()
      await delay(waitMs)
      return () => vue.h("h1", `${t("foo")}:${manager.getLanguage()}`)
    },
  })

  const app = vue.createSSRApp(
    vue.defineComponent({ render: () => vue.h(vue.Suspense, null, { default: () => vue.h(Page) }) }),
  )
  app.use(createI18n(language))
  return app
}

describe("useI18n", () => {
  it("returns a t function", () => {
    const { t } = useI18n()
    expect(typeof t).toBe("function")
  })

  it("uses the global language outside components", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("uk")

    expect(useI18n().t("foo")).toBe("Фуу")
  })

  describe("plain", () => {
    it("falls back to the key when no translation exists", () => {
      const { t } = useI18n()
      expect(t("missing.key")).toBe("missing.key")
    })

    it("returns the translated string after mergeTranslations", () => {
      manager.mergeTranslations({ greeting: "Hello" })
      const { t } = useI18n()
      expect(t("greeting")).toBe("Hello")
    })

    it("reflects translations loaded via loadTranslations", async () => {
      manager.registerEntryLoader(() => Promise.resolve({ hello: "world" }))
      await manager.loadTranslations("en")
      const { t } = useI18n()
      expect(t("hello")).toBe("world")
    })
  })

  describe("interpolation", () => {
    it("substitutes a single param", () => {
      manager.mergeTranslations({ greeting: "Hello, {name}!" })
      const { t } = useI18n()
      expect(t("greeting", { name: "World" })).toBe("Hello, World!")
    })

    it("substitutes multiple params", () => {
      manager.mergeTranslations({ msg: "{a} and {b}" })
      const { t } = useI18n()
      expect(t("msg", { a: "foo", b: "bar" })).toBe("foo and bar")
    })

    it("substitutes params with surrounding spaces", () => {
      manager.mergeTranslations({ greeting: "Hello, { name }!" })
      const { t } = useI18n()
      expect(t("greeting", { name: "World" })).toBe("Hello, World!")
    })

    it("leaves unknown placeholders intact", () => {
      manager.mergeTranslations({ msg: "Hello, {name}!" })
      const { t } = useI18n()
      expect(t("msg", {})).toBe("Hello, {name}!")
    })
  })
})

describe("createI18n", () => {
  it("isolates concurrent renders in different languages", async () => {
    manager.registerEntryLoader(loadDictionary)

    const languages = ["hu", "uk", "en", "hu", "uk", "en"]
    const results = await Promise.all(
      languages.map(async (language, i) => {
        await manager.loadTranslations(language)
        return serverRenderer.renderToString(createPage(language, (languages.length - i) * 10))
      }),
    )

    expect(results).toEqual(languages.map(language => `<h1>${DICTIONARIES[language]?.foo}:${language}</h1>`))
  })

  it("keeps the app language when the global language changes", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    const pending = serverRenderer.renderToString(createPage("hu", 20))

    await manager.loadTranslations("uk")

    await expect(pending).resolves.toBe("<h1>Fóö:hu</h1>")
  })

  it("falls back to the global language without createI18n", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("en")

    const html = renderWith(() => {
      const { t } = useI18n()
      return () => vue.h("h1", t("foo"))
    })

    await expect(html).resolves.toBe("<h1>Foo</h1>")
  })
})

describe("manager.getLanguage", () => {
  it("throws when language has not been set", () => {
    expect(() => manager.getLanguage()).toThrow("[@vue-sfc-i18n/composable] language is not set")
  })

  it("returns the language set by loadTranslations", async () => {
    await manager.loadTranslations("hu")
    expect(manager.getLanguage()).toBe("hu")
  })

  it("returns the app language inside a scoped app and the global language outside", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    await manager.loadTranslations("uk")

    let inside = ""
    await renderWith(() => {
      inside = manager.getLanguage()
      return () => vue.h("div")
    }, "hu")

    expect(inside).toBe("hu")
    expect(manager.getLanguage()).toBe("uk")
  })
})

describe("manager.loadTranslations", () => {
  it("sets the language", async () => {
    await manager.loadTranslations("en")
    expect(manager.getLanguage()).toBe("en")
  })

  it("loads translations from registered loaders", async () => {
    manager.registerEntryLoader(() => Promise.resolve({ key: "value" }))
    await manager.loadTranslations("en")
    const { t } = useI18n()
    expect(t("key")).toBe("value")
  })

  it("merges results from multiple loaders, later loaders win on conflict", async () => {
    manager.registerEntryLoader(() => Promise.resolve({ a: "first", b: "b-value" }))
    manager.registerEntryLoader(() => Promise.resolve({ a: "second" }))
    await manager.loadTranslations("en")
    const { t } = useI18n()
    expect(t("a")).toBe("second")
    expect(t("b")).toBe("b-value")
  })

  it("throws when loaders are registered but all return empty objects", async () => {
    manager.registerEntryLoader(() => Promise.resolve({}))
    await expect(manager.loadTranslations("en")).rejects.toThrow(
      '[@vue-sfc-i18n/composable] no translations found for language "en"',
    )
  })

  it("does not throw when no loaders are registered", async () => {
    await expect(manager.loadTranslations("en")).resolves.toBeUndefined()
  })

  it("calls loaders once per language", async () => {
    const loader = vi.fn(loadDictionary)
    manager.registerEntryLoader(loader)

    await Promise.all([manager.loadTranslations("hu"), manager.loadTranslations("hu")])
    await manager.loadTranslations("hu")
    await manager.loadTranslations("uk")

    expect(loader.mock.calls).toEqual([["hu"], ["uk"]])
  })

  it("retries a language after a failed load", async () => {
    const loader = vi
      .fn<(language: string) => Promise<Record<string, string>>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementation(loadDictionary)
    manager.registerEntryLoader(loader)

    await expect(manager.loadTranslations("hu")).rejects.toThrow("network")

    await manager.loadTranslations("hu")

    expect(useI18n().t("foo")).toBe("Fóö")
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it("does not switch the global language when loading fails", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    await manager.registerEntryLoader(async language => {
      if (language === "uk") throw new Error("network")
      return {}
    })

    await expect(manager.loadTranslations("uk")).rejects.toThrow("network")

    expect(manager.getLanguage()).toBe("hu")
  })

  it("does not call late loaders for a language whose load failed", async () => {
    manager.registerEntryLoader(() => Promise.reject(new Error("network")))
    await expect(manager.loadTranslations("hu")).rejects.toThrow("network")

    const late = vi.fn(loadDictionary)
    await manager.registerEntryLoader(late)

    expect(late).not.toHaveBeenCalled()
  })
})

describe("manager.registerEntryLoader", () => {
  it("loads a late entry into every already loaded language", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    await manager.loadTranslations("uk")

    await manager.registerEntryLoader(async language => ({ late: `late-${language}` }))

    await manager.loadTranslations("hu")
    expect(useI18n().t("late")).toBe("late-hu")
    await manager.loadTranslations("uk")
    expect(useI18n().t("late")).toBe("late-uk")
  })

  it("loads an entry registered while a language is still loading, and lets it win on conflict", async () => {
    let release = () => {}
    manager.registerEntryLoader(
      language =>
        new Promise(resolve => {
          release = () => resolve({ ...DICTIONARIES[language], shared: "early" })
        }),
    )

    const loading = manager.loadTranslations("hu")
    const registering = manager.registerEntryLoader(async language => ({ late: `late-${language}`, shared: "late" }))
    await registering
    release()
    await loading

    const { t } = useI18n()
    expect(t("foo")).toBe("Fóö")
    expect(t("late")).toBe("late-hu")
    expect(t("shared")).toBe("late")
  })

  it("does not call loaders for translations merged before any language is set", async () => {
    manager.mergeTranslations({ x: "X" })

    const loader = vi.fn(loadDictionary)
    await manager.registerEntryLoader(loader)

    expect(loader).not.toHaveBeenCalled()
  })
})

describe("manager.mergeTranslations", () => {
  it("adds new keys to translations", () => {
    manager.mergeTranslations({ x: "X" })
    const { t } = useI18n()
    expect(t("x")).toBe("X")
  })

  it("overwrites existing keys", () => {
    manager.mergeTranslations({ x: "original" })
    manager.mergeTranslations({ x: "updated" })
    const { t } = useI18n()
    expect(t("x")).toBe("updated")
  })

  it("preserves keys not present in the new data", () => {
    manager.mergeTranslations({ a: "A", b: "B" })
    manager.mergeTranslations({ b: "B2" })
    const { t } = useI18n()
    expect(t("a")).toBe("A")
  })

  it("merges into the given language only", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("uk")
    await manager.loadTranslations("hu")

    manager.mergeTranslations({ foo: "Фоо" }, "uk")

    expect(useI18n().t("foo")).toBe("Fóö")

    await manager.loadTranslations("uk")

    expect(useI18n().t("foo")).toBe("Фоо")
  })
})

describe("pluralization", () => {
  it("selects the first variant for count 1 (default rule)", () => {
    manager.mergeTranslations({ items: "one item | many items" })
    const { t } = useI18n()
    expect(t("items", 1)).toBe("one item")
  })

  it("selects the second variant for count != 1 (default rule)", () => {
    manager.mergeTranslations({ items: "one item | many items" })
    const { t } = useI18n()
    expect(t("items", 5)).toBe("many items")
  })

  it("interpolates {n} in the selected variant", () => {
    manager.mergeTranslations({ items: "one item | {n} items" })
    const { t } = useI18n()
    expect(t("items", 3)).toBe("3 items")
  })

  it("uses a custom plural rule for the active language", async () => {
    manager.setPluralRules({
      uk: choice => {
        if (choice % 10 === 1 && choice !== 11) return 0
        if (choice % 10 >= 2 && choice % 10 <= 4 && (choice < 12 || choice > 14)) return 1
        return 2
      },
    })
    manager.registerEntryLoader(() => Promise.resolve({ items: "предмет | предмети | предметів" }))
    await manager.loadTranslations("uk")
    const { t } = useI18n()
    expect(t("items", 1)).toBe("предмет")
    expect(t("items", 3)).toBe("предмети")
    expect(t("items", 11)).toBe("предметів")
  })

  it("uses the plural rule of the app language, not the global one", async () => {
    manager.setPluralRules({ uk: _choice => 2, hu: _choice => 0 })
    manager.registerEntryLoader(async language =>
      language === "hu" ? { items: "{n} elem | {n} elemek" } : { items: "{n} предмет | {n} предмети | {n} предметів" },
    )
    await manager.loadTranslations("hu")
    await manager.loadTranslations("uk")

    const html = renderWith(() => {
      const { t } = useI18n()
      return () => vue.h("p", t("items", 3))
    }, "hu")

    await expect(html).resolves.toBe("<p>3 elem</p>")
  })

  it("throws when rule index exceeds variant count", async () => {
    manager.setPluralRules({ en: _choice => 5 })
    manager.registerEntryLoader(() => Promise.resolve({ items: "one | many" }))
    await manager.loadTranslations("en")
    const { t } = useI18n()
    expect(() => t("items", 1)).toThrow(
      '[@vue-sfc-i18n/composable] plural rule returned index 5 for key "items", but only 2 variant(s) exist',
    )
  })

  it("throws when rule returns a negative index", async () => {
    manager.setPluralRules({ en: _choice => -1 })
    manager.registerEntryLoader(() => Promise.resolve({ items: "one | many" }))
    await manager.loadTranslations("en")
    const { t } = useI18n()
    expect(() => t("items", 1)).toThrow(
      '[@vue-sfc-i18n/composable] plural rule returned index -1 for key "items", but only 2 variant(s) exist',
    )
  })
})

describe("reactivity", () => {
  it("updates text when the global language changes", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    const { t } = useI18n()
    const foo = vue.computed(() => t("foo"))
    expect(foo.value).toBe("Fóö")

    await manager.loadTranslations("en")

    expect(foo.value).toBe("Foo")
  })

  it("updates text when a late entry adds translations", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    const { t } = useI18n()
    const late = vue.computed(() => t("late"))
    expect(late.value).toBe("late")

    await manager.registerEntryLoader(async language => ({ late: `late-${language}` }))

    expect(late.value).toBe("late-hu")
  })

  it("updates text when translations are merged, e.g. by HMR", async () => {
    manager.registerEntryLoader(loadDictionary)
    await manager.loadTranslations("hu")
    const { t } = useI18n()
    const foo = vue.computed(() => t("foo"))

    manager.mergeTranslations({ foo: "Foő" }, "hu")

    expect(foo.value).toBe("Foő")
  })
})
