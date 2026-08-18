import { readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import type { Plugin, ResolvedConfig, ViteDevServer } from "vite"
import picomatch from "picomatch"
import { extractTranslations, walkVueFiles, type Translations } from "@vue-sfc-i18n/shared"
import { generateKeys } from "@vue-sfc-i18n/generate"

const VIRTUAL_PREFIX = "virtual:i18n/"
const RESOLVED_PREFIX = "\0virtual:i18n/"

function toEntryKey (relPath: string): string {
  return relPath
    .replace(/\.vue$/u, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
}

type Resolver = (id: string, importer: string) => Promise<null | string>

function extractVueImports (code: string): string[] {
  const imports: string[] = []
  const regex = /\bimport\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"](?<path>[^'"]+\.vue)['"]/gmu
  let match = regex.exec(code)
  // eslint-disable-next-line ts/strict-boolean-expressions -- skip
  while (match?.groups) {
    imports.push(match.groups.path)
    match = regex.exec(code)
  }
  return imports
}

async function collectTranslationsRecursively (
  file: string,
  resolver: Resolver,
  visited = new Set<string>(),
): Promise<Translations> {
  if (visited.has(file))
    return {}
  visited.add(file)

  const code = readFileSync(file, "utf-8")
  const translations = extractTranslations(code)

  const childPaths = await Promise.all(
    extractVueImports(code).map(importPath => resolver(importPath, file)),
  )

  await Promise.all(
    childPaths
      .filter(childPath => childPath !== null)
      .map(async childPath => {
        const childTranslations = await collectTranslationsRecursively(childPath, resolver, visited)
        for (const [ lang, dict ] of Object.entries(childTranslations))
          translations[lang] = { ...translations[lang], ...dict }
      }),
  )

  return translations
}

/**
 * @param keysFile - Path to write the generated `I18nSchema` augmentation, relative to `srcDir`.
 *   Must be present on disk but must NOT be committed to git (add to `.gitignore`).
 *   Run `generate:i18n` script to create it before starting the dev server.
 * @param srcDir - Absolute path to the source directory. Defaults to `<root>/src`.
 */
export function i18nPlugin ({ entries, keysFile, srcDir }: { entries: string[], keysFile: string, srcDir?: string }): Plugin {
  const entryMap = new Map<string, Translations>()
  const entryKeyByFile = new Map<string, string>()
  const isEntry = picomatch(entries)
  let resolvedSrcDir = ""
  let resolvedKeysFile = ""
  let resolver: Resolver = () => Promise.resolve(null)

  async function buildAll (): Promise<void> {
    entryMap.clear()
    entryKeyByFile.clear()

    const allFiles = await walkVueFiles(resolvedSrcDir)
    const normalizeFile = (f: string) => relative(resolvedSrcDir, f).replaceAll(sep, "/")
    const entryFiles = allFiles.filter(file => isEntry(normalizeFile(file)))

    const results = await Promise.all(
      entryFiles.map(async file => {
        const translations = await collectTranslationsRecursively(file, resolver)
        return { file, translations }
      }),
    )

    results.forEach(({ file, translations }) => {
      const key = toEntryKey(normalizeFile(file))
      entryMap.set(key, translations)
      entryKeyByFile.set(file, key)
    })

    await generateKeys(resolvedSrcDir, resolvedKeysFile)
  }

  function invalidateVirtualModules (server: ViteDevServer): void {
    for (const key of entryMap.keys()) {
      const mod = server.moduleGraph.getModuleById(`${RESOLVED_PREFIX}entry/${key}`)
      if (mod !== undefined)
        server.moduleGraph.invalidateModule(mod)
    }
  }

  return {
    name: "vue-sfc-i18n",
    enforce: "pre",

    configResolved (config: ResolvedConfig) {
      resolvedSrcDir = srcDir ?? join(config.root, "src")
      resolvedKeysFile = join(resolvedSrcDir, keysFile)
    },

    async buildStart () {
      resolver = async (id, importer) => {
        const r = await this.resolve(id, importer)
        return r?.id ?? null
      }
      await buildAll()
    },

    transform (code, id) {
      if (!id.endsWith(".vue"))
        return undefined

      let result = code.replaceAll(/<i18n\b[^>]*>[\S\s]*?<\/i18n>/gu, "")

      const entryKey = entryKeyByFile.get(id)
      if (entryKey !== undefined) {
        result = result.replace(
          /(?<tag><script\b[^>]*>)/u,
          `$<tag>\nimport 'virtual:i18n/entry/${entryKey}'`,
        )
      }

      return result
    },

    resolveId (id) {
      if (id.startsWith(VIRTUAL_PREFIX))
        return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length)

      return undefined
    },

    load (id) {
      if (!id.startsWith(RESOLVED_PREFIX))
        return undefined

      const rest = id.slice(RESOLVED_PREFIX.length)

      if (!rest.startsWith("entry/"))
        return undefined

      const afterEntry = rest.slice("entry/".length)
      const slash = afterEntry.indexOf("/")

      if (slash !== -1) {
        const key = afterEntry.slice(0, slash)
        const language = afterEntry.slice(slash + 1)
        const translations = entryMap.get(key)
        if (translations === undefined)
          return undefined
        return `export default ${JSON.stringify(translations[language] ?? {})}`
      }

      const translations = entryMap.get(afterEntry)
      if (translations === undefined)
        return undefined

      const loaders = Object.keys(translations)
        .map(lang => {
          const virtualPath = JSON.stringify(`virtual:i18n/entry/${afterEntry}/${lang}`)
          return `  ${JSON.stringify(lang)}: () => import(${virtualPath})`
        })
        .join(",\n")

      return [
        "import { manager } from '@vue-sfc-i18n/composable'",
        `const _loaders = {\n${loaders}\n}`,
        "async function _load() {",
        "  const _fn = _loaders[manager.getLanguage()]",
        "  return _fn ? (await _fn()).default : {}",
        "}",
        "manager.registerEntryLoader(_load)",
        "manager.mergeTranslations(await _load())",
        "export {}",
      ].join("\n")
    },

    async handleHotUpdate ({ file, server }) {
      if (!file.endsWith(".vue")) {
        const translations = extractTranslations(readFileSync(file, "utf-8"))
        if (Object.keys(translations).length > 0) {
          await buildAll()
          invalidateVirtualModules(server)
          server.ws.send({ type: "full-reload" })
          return []
        }
      }

      return undefined
    },
  }
}
