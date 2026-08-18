import { readFile, writeFile } from "node:fs/promises"

import { extractTranslations, walkVueFiles } from "@vue-sfc-i18n/shared"

/**
 * Generate an `I18nSchema` module augmentation from all `<i18n>` blocks in `.vue` files.
 *
 * The output file must be present on disk but must NOT be committed to git (add to `.gitignore`).
 * Run this once before starting the dev server (or in a CI prebuild step).
 */
export async function generateKeys (srcDir: string, keysFile: string): Promise<void> {
  const files = await walkVueFiles(srcDir)
  const allKeys = new Set<string>()

  await Promise.all(
    files.map(async file => {
      const code = await readFile(file, "utf-8")
      const translations = extractTranslations(code)

      Object.values(translations).forEach(keys => {
        Object.keys(keys).forEach(key => {
          allKeys.add(key)
        })
      })
    }),
  )

  const content = [
    `declare module "@vue-sfc-i18n/composable" {`,
    "  interface I18nSchema {",
    [ ...allKeys ].map(k => `    ${JSON.stringify(k)}: string`).join("\n"),
    "  }",
    "}",
    "",
    "export {}",
    "",
  ].join("\n")

  await writeFile(keysFile, content)
}
