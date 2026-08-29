import * as fs from "node:fs/promises"
import * as path from "node:path"

import { extractTranslations, walkVueFiles } from "@vue-sfc-i18n/shared"

const PLACEHOLDER_RE = /\{(\w+)\}/g

function extractParams (value: string): string[] {
  const result: string[] = []
  let m: RegExpExecArray | null
  PLACEHOLDER_RE.lastIndex = 0

  while ((m = PLACEHOLDER_RE.exec(value)) !== null)
    result.push(m[1])

  return result
}

function keyEntry (key: string, params: Set<string>): string {
  if (params.size === 0)
    return `      ${JSON.stringify(key)}: string`

  const inner = [ ...params ].map(p => `${p}: string | number`).join("; ")

  return `      ${JSON.stringify(key)}: { ${inner} }`
}

/**
 * Generate an `I18nSchema` module augmentation from all `<i18n>` blocks in `.vue` files.
 *
 * The output file must be present on disk but must NOT be committed to git (add to `.gitignore`).
 * Run this once before starting the dev server (or in a CI prebuild step).
 */
export async function generateKeys (srcDir: string, keysFile: string): Promise<void> {
  const files = await walkVueFiles(srcDir)
  const perFile = new Map<string, Map<string, Set<string>>>()

  await Promise.all(
    files.map(async file => {
      const code = await fs.readFile(file, "utf-8")
      const translations = extractTranslations(code)
      const keys = new Map<string, Set<string>>()

      Object.values(translations).forEach(localeKeys => {
        Object.entries(localeKeys).forEach(([ key, value ]) => {
          if (!keys.has(key))
            keys.set(key, new Set())

          for (const p of extractParams(value))
            keys.get(key)!.add(p)
        })
      })

      perFile.set(path.relative(srcDir, file), keys)
    }),
  )

  const fileEntries = [ ...perFile.entries() ]
    .map(([ filePath, keys ]) => {
      const keyLines = [ ...keys.entries() ]
        .map(([ k, params ]) => keyEntry(k, params))
        .join("\n")

      return `    ${JSON.stringify(filePath)}: {\n${keyLines}\n    }`
    })
    .join("\n")

  const content = [
    `declare module "@vue-sfc-i18n/composable" {`,
    "  interface I18nSchema {",
    fileEntries,
    "  }",
    "}",
    "",
    "export {}",
    "",
  ].join("\n")

  await fs.writeFile(keysFile, content)
}
