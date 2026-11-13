import { getCurrentInstance, inject, ref, type App, type InjectionKey, type Ref } from "vue"

// eslint-disable-next-line ts/no-empty-interface, ts/consistent-type-definitions -- needed for augmentation
export interface I18nSchema {}

type KeysOf<F extends string> = F extends keyof I18nSchema ? keyof I18nSchema[F] : keyof I18nSchema[keyof I18nSchema]

type ParamsArg<F extends keyof I18nSchema, K extends KeysOf<F>> = K extends keyof I18nSchema[F]
  ? I18nSchema[F][K] extends string
    ? []
    : [params: I18nSchema[F][K]]
  : [params?: Record<string, string | number> | number]

type Dictionary = Record<string, string>

type EntryLoader = (language: string) => Promise<Dictionary>

export type PluralRule = (choice: number) => number

const NO_LANGUAGE = ""
const LANGUAGE_KEY: InjectionKey<string> = Symbol("vue-sfc-i18n:language")

const activeLanguage = ref<null | string>(null)

const dictionaries = new Map<string, Ref<Dictionary>>()
const loadings = new Map<string, Promise<void>>()
const entryLoaders: EntryLoader[] = []

const defaultPluralRule: PluralRule = choice => (choice === 1 ? 0 : 1)

const pluralRules: Record<string, PluralRule> = {}

const interpolate = (str: string, params: Record<string, string | number>): string =>
  str.replace(/\{\s*(\w+)\s*\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))

const getDictionary = (language: string): Ref<Dictionary> => {
  const existing = dictionaries.get(language)
  if (existing !== undefined) return existing

  const created = ref<Dictionary>({})
  dictionaries.set(language, created)
  return created
}

const merge = (language: string, data: Dictionary): void => {
  const dictionary = getDictionary(language)
  dictionary.value = { ...dictionary.value, ...data }
}

const injectLanguage = (): string | undefined =>
  getCurrentInstance() === null ? undefined : inject(LANGUAGE_KEY, undefined)

const resolveLanguage = (scoped?: string): string => scoped ?? activeLanguage.value ?? NO_LANGUAGE

const fetchTranslations = async (language: string, loaders: EntryLoader[]): Promise<Dictionary> => {
  const results = await Promise.all(loaders.map(fn => fn(language)))
  return results.reduce<Dictionary>((acc, r) => ({ ...acc, ...r }), {})
}

const ensureLoaded = (language: string): Promise<void> => {
  const existing = loadings.get(language)
  if (existing !== undefined) return existing

  const isNew = !dictionaries.has(language)
  const dictionary = getDictionary(language)

  const loading = fetchTranslations(language, [...entryLoaders]).then(data => {
    if (entryLoaders.length > 0 && Object.keys(data).length === 0)
      throw new Error(`[@vue-sfc-i18n/composable] no translations found for language "${language}"`)

    dictionary.value = { ...data, ...dictionary.value }
  })

  loadings.set(language, loading)
  loading.catch(() => {
    loadings.delete(language)
    if (isNew) dictionaries.delete(language)
  })

  return loading
}

export const createI18n = (language: string) => ({
  install(app: App): void {
    app.provide(LANGUAGE_KEY, language)
  },
})

export const useI18n = <F extends keyof I18nSchema = keyof I18nSchema>(_filePath?: F) => {
  const scoped = injectLanguage()

  const t = <K extends KeysOf<F>>(key: K, ...args: ParamsArg<F, K>): string => {
    const language = resolveLanguage(scoped)
    const raw = dictionaries.get(language)?.value[key as string] ?? (key as string)
    const arg = args[0] as number | Record<string, string | number> | undefined

    if (typeof arg === "number") {
      const rule = pluralRules[language] ?? defaultPluralRule
      const parts = raw.split("|").map(p => p.trim())
      const index = rule(arg)
      const variant = parts[index]

      if (index < 0 || variant === undefined)
        throw new Error(
          `[@vue-sfc-i18n/composable] plural rule returned index ${index} for key "${key as string}", but only ${parts.length} variant(s) exist`,
        )

      return interpolate(variant, { n: arg })
    }

    return arg ? interpolate(raw, arg) : raw
  }

  return { t }
}

export const manager = {
  /** @private */
  getLanguage(): string {
    const language = injectLanguage() ?? activeLanguage.value
    if (language === null) throw new Error("[@vue-sfc-i18n/composable] language is not set")

    return language
  },

  async loadTranslations(lang: string): Promise<void> {
    await ensureLoaded(lang)
    activeLanguage.value = lang
  },

  /** @private */
  mergeTranslations(data: Dictionary, language: string = resolveLanguage()): void {
    merge(language, data)
  },

  /** @private */
  async registerEntryLoader(fn: EntryLoader): Promise<void> {
    entryLoaders.push(fn)

    await Promise.all(
      [...dictionaries.keys()]
        .filter(language => language !== NO_LANGUAGE)
        .map(async language => {
          merge(language, await fn(language))
        }),
    )
  },

  setPluralRules(rules: Record<string, PluralRule>): void {
    Object.assign(pluralRules, rules)
  },
}
