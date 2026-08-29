import { beforeEach, describe, expect, it, vi } from "vitest"

type Mod = typeof import("./index")

let useI18n: Mod["useI18n"]
let manager: Mod["manager"]

beforeEach(async () => {
  vi.resetModules()
  const mod: Mod = await import("./index")
  useI18n = mod.useI18n
  manager = mod.manager
})

describe("useI18n", () => {
  it("returns a t function", () => {
    const { t } = useI18n()
    expect(typeof t).toBe("function")
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

describe("manager.getLanguage", () => {
  it("throws when language has not been set", () => {
    expect(() => manager.getLanguage()).toThrow(
      "[@vue-sfc-i18n/composable] language is not set",
    )
  })

  it("returns the language set by loadTranslations", async () => {
    await manager.loadTranslations("hu")
    expect(manager.getLanguage()).toBe("hu")
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
      uk: (choice) => {
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

  it("throws when rule index exceeds variant count", async () => {
    manager.setPluralRules({ en: (_choice) => 5 })
    manager.registerEntryLoader(() => Promise.resolve({ items: "one | many" }))
    await manager.loadTranslations("en")
    const { t } = useI18n()
    expect(() => t("items", 1)).toThrow(
      '[@vue-sfc-i18n/composable] plural rule returned index 5 for key "items", but only 2 variant(s) exist',
    )
  })

  it("throws when rule returns a negative index", async () => {
    manager.setPluralRules({ en: (_choice) => -1 })
    manager.registerEntryLoader(() => Promise.resolve({ items: "one | many" }))
    await manager.loadTranslations("en")
    const { t } = useI18n()
    expect(() => t("items", 1)).toThrow(
      '[@vue-sfc-i18n/composable] plural rule returned index -1 for key "items", but only 2 variant(s) exist',
    )
  })
})

describe("manager.fetchEntryTranslations", () => {
  it("returns an empty object when no loaders are registered", async () => {
    const result = await manager.fetchEntryTranslations()
    expect(result).toEqual({})
  })

  it("returns the merged result of all loaders", async () => {
    manager.registerEntryLoader(() => Promise.resolve({ a: "1" }))
    manager.registerEntryLoader(() => Promise.resolve({ b: "2" }))
    const result = await manager.fetchEntryTranslations()
    expect(result).toEqual({ a: "1", b: "2" })
  })
})
