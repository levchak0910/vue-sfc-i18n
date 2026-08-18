import { readdir } from "node:fs/promises"
import { join } from "node:path"

import * as sfc from "@vue/compiler-sfc"
import * as yaml from "yaml"

export type Translations = Record<string, Record<string, string>>

export function extractTranslations (code: string): Translations {
  const translations: Translations = {}
  const { descriptor } = sfc.parse(code)

  for (const block of descriptor.customBlocks) {
    if (block.type !== "i18n")
      continue

    const language = typeof block.attrs.locale === "string" ? block.attrs.locale : ""
    const parsed: unknown = yaml.parse(block.content)

    if (parsed === null || typeof parsed !== "object")
      continue

    for (const [ key, value ] of Object.entries(parsed)) {
      if (typeof value !== "string")
        continue

      translations[language] ??= {}
      translations[language][key] = value
    }
  }

  return translations
}

export async function walkVueFiles (dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })

  const nested = await Promise.all(
    entries.map(async entry => {
      const full = join(dir, entry.name)

      if (entry.isDirectory() && entry.name !== "node_modules")
        return walkVueFiles(full)

      return entry.name.endsWith(".vue") ? [ full ] : []
    }),
  )

  return nested.flat()
}
