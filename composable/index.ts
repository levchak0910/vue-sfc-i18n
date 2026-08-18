import { ref } from "vue"

// eslint-disable-next-line ts/no-empty-interface, ts/consistent-type-definitions -- needed for augmentation
export interface I18nSchema {}

type TranslationKey = keyof I18nSchema extends never ? string : keyof I18nSchema

const translations = ref<Record<string, string>>({})
const language = ref<null | string>(null)

type EntryLoader = () => Promise<Record<string, string>>
const entryLoaders: EntryLoader[] = []

const t = (key: TranslationKey): string => translations.value[key] ?? key

export const useI18n = (): { t: (key: TranslationKey) => string } => ({ t })

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
