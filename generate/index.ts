import { readFile, writeFile } from "node:fs/promises"

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
    return `    ${JSON.stringify(key)}: string`

  const inner = [ ...params ].map(p => `${p}: string | number`).join("; ")

  return `    ${JSON.stringify(key)}: { ${inner} }`
}

/**
 * Generate an `I18nSchema` module augmentation from all `<i18n>` blocks in `.vue` files.
 *
 * The output file must be present on disk but must NOT be committed to git (add to `.gitignore`).
 * Run this once before starting the dev server (or in a CI prebuild step).
 */
export async function generateKeys (srcDir: string, keysFile: string): Promise<void> {
  const files = await walkVueFiles(srcDir)
  const allKeys = new Map<string, Set<string>>()

  await Promise.all(
    files.map(async file => {
      const code = await readFile(file, "utf-8")
      const translations = extractTranslations(code)

      Object.values(translations).forEach(keys => {
        Object.entries(keys).forEach(([ key, value ]) => {
          if (!allKeys.has(key))
            allKeys.set(key, new Set())
          
          for (const p of extractParams(value))
            allKeys.get(key)!.add(p)
        })
      })
    }),
  )

  const content = [
    `declare module "@vue-sfc-i18n/composable" {`,
    "  interface I18nSchema {",
    [ ...allKeys.entries() ].map(([ k, params ]) => keyEntry(k, params)).join("\n"),
    "  }",
    "}",
    "",
    "export {}",
    "",
  ].join("\n")

  await writeFile(keysFile, content)
}
