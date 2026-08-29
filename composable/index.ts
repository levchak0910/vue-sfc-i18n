import { ref } from "vue"

// eslint-disable-next-line ts/no-empty-interface, ts/consistent-type-definitions -- needed for augmentation
export interface I18nSchema {}

type KeysOf<F extends string> = F extends keyof I18nSchema ? keyof I18nSchema[F] : keyof I18nSchema[keyof I18nSchema]

type ParamsArg<F extends keyof I18nSchema, K extends KeysOf<F>> = K extends keyof I18nSchema[F]
    ? I18nSchema[F][K] extends string
      ? []
      : [params: I18nSchema[F][K]]
    : [params?: Record<string, string | number> | number]

const translations = ref<Record<string, string>>({})
const language = ref<null | string>(null)

type EntryLoader = () => Promise<Record<string, string>>
const entryLoaders: EntryLoader[] = []

export type PluralRule = (choice: number) => number

const defaultPluralRule: PluralRule = (choice) => choice === 1 ? 0 : 1

const pluralRules: Record<string, PluralRule> = {}

const interpolate = (str: string, params: Record<string, string | number>): string =>
  str.replace(/\{\s*(\w+)\s*\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))

export const useI18n = <F extends keyof I18nSchema = keyof I18nSchema>(_filePath?: F) => {
  const t = <K extends KeysOf<F>>(key: K, ...args: ParamsArg<F, K>): string => {
    const raw = translations.value[key as string] ?? (key as string)
    const arg = args[0] as number | Record<string, string | number> | undefined

    if (typeof arg === "number") {
      const rule = pluralRules[language.value ?? ""] ?? defaultPluralRule
      const parts = raw.split("|").map(p => p.trim())
      const index = rule(arg)
      const variant = parts[index]

      if (index < 0 || variant === undefined)
        throw new Error(`[@vue-sfc-i18n/composable] plural rule returned index ${index} for key "${key as string}", but only ${parts.length} variant(s) exist`)

      return interpolate(variant, { n: arg })
    }

    return arg ? interpolate(raw, arg) : raw
  }

  return { t }
}

export const manager = {
  /** @private */
  getLanguage (): string {
    if (language.value === null)
      throw new Error("[@vue-sfc-i18n/composable] language is not set")

    return language.value
  },

  async loadTranslations (lang: string): Promise<void> {
    language.value = lang
    const data = await manager.fetchEntryTranslations()

    if (entryLoaders.length > 0 && Object.keys(data).length === 0)
      throw new Error(`[@vue-sfc-i18n/composable] no translations found for language "${lang}"`)

    translations.value = data
  },

  /** @private */
  mergeTranslations (data: Record<string, string>): void {
    translations.value = { ...translations.value, ...data }
  },

  /** @private */
  registerEntryLoader (fn: EntryLoader): void {
    entryLoaders.push(fn)
  },

  /** @private */
  async fetchEntryTranslations (): Promise<Record<string, string>> {
    const results = await Promise.all(entryLoaders.map(fn => fn()))
    return results.reduce<Record<string, string>>((acc, r) => ({ ...acc, ...r }), {})
  },

  setPluralRules (rules: Record<string, PluralRule>): void {
    Object.assign(pluralRules, rules)
  },
}
