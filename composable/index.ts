import { ref } from "vue"

// eslint-disable-next-line ts/no-empty-interface, ts/consistent-type-definitions -- needed for augmentation
export interface I18nSchema {}

type TranslationKey = keyof I18nSchema extends never ? string : keyof I18nSchema
type ParamsArg<K extends TranslationKey> =
  K extends keyof I18nSchema
    ? I18nSchema[K] extends string
      ? []
      : [params: I18nSchema[K]]
    : [params?: Record<string, string | number>]

const translations = ref<Record<string, string>>({})
const language = ref<null | string>(null)

type EntryLoader = () => Promise<Record<string, string>>
const entryLoaders: EntryLoader[] = []

const interpolate = (str: string, params: Record<string, string | number>): string =>
  str.replace(/\{\s*(\w+)\s*\}/g, (_, k: string) => String(params[k] ?? `{${k}}`))

const t = <K extends TranslationKey>(key: K, ...args: ParamsArg<K>): string => {
  const value = translations.value[key] ?? key
  const params = args[0]
  return params ? interpolate(value, params) : value
}

export const useI18n = () => ({ t })

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
}
