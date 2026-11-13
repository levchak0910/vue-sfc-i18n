import { readFileSync } from "node:fs"
import { join, relative, sep } from "node:path"

import { generateKeys } from "@vue-sfc-i18n/generate"
import { extractTranslations, walkVueFiles, type Translations } from "@vue-sfc-i18n/shared"
import { parse as parseSFC } from "@vue/compiler-sfc"
import { parseSync as parseJS, Visitor } from "oxc-parser"
import picomatch from "picomatch"
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite"

const VIRTUAL_PREFIX = "virtual:i18n/"
const RESOLVED_PREFIX = "\0virtual:i18n/"

function toEntryKey(relPath: string): string {
  return relPath
    .replace(/\.vue$/u, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
}

type Resolver = (id: string, importer: string) => Promise<null | string>

function extractVueImports(code: string): string[] {
  const { descriptor } = parseSFC(code)
  const imports: string[] = []

  for (const block of [descriptor.script, descriptor.scriptSetup]) {
    if (block === null) continue

    const { program } = parseJS("script.ts", block.content)

    const visitor = new Visitor({
      ImportDeclaration(node) {
        if (node.source.value.endsWith(".vue")) imports.push(node.source.value)
      },
      ImportExpression(node) {
        if (
          node.source.type === "Literal"
          && typeof node.source.value === "string"
          && node.source.value.endsWith(".vue")
        )
          imports.push(node.source.value)
      },
    })

    visitor.visit(program)
  }

  return imports
}

async function collectTranslationsRecursively(
  file: string,
  resolver: Resolver,
  visited = new Set<string>(),
): Promise<Translations> {
  if (visited.has(file)) return {}
  visited.add(file)

  const code = readFileSync(file, "utf-8")
  const translations = extractTranslations(code)

  const childPaths = await Promise.all(extractVueImports(code).map(importPath => resolver(importPath, file)))

  await Promise.all(
    childPaths
      .filter(childPath => childPath !== null)
      .map(async childPath => {
        const childTranslations = await collectTranslationsRecursively(childPath, resolver, visited)
        for (const [lang, dict] of Object.entries(childTranslations))
          translations[lang] = { ...translations[lang], ...dict }
      }),
  )

  return translations
}

/**
 * @param keysFile - Path to write the generated `I18nSchema` augmentation, relative to `srcDir`. Must be present on
 *   disk but must NOT be committed to git (add to `.gitignore`). Run `generate:i18n` script to create it before
 *   starting the dev server.
 * @param srcDir - Absolute path to the source directory. Defaults to `<root>/src`.
 */
export function i18nPlugin({
  entries,
  keysFile,
  srcDir,
}: {
  entries: string[]
  keysFile: string
  srcDir?: string
}): Plugin {
  const entryMap = new Map<string, Translations>()
  const entryKeyByFile = new Map<string, string>()
  const isEntry = picomatch(entries)
  let resolvedSrcDir = ""
  let resolvedKeysFile = ""
  let resolver: Resolver = () => Promise.resolve(null)

  async function buildAll(): Promise<void> {
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

  function invalidateVirtualModules(server: ViteDevServer): void {
    for (const [key, translations] of entryMap.entries()) {
      const entryMod = server.moduleGraph.getModuleById(`${RESOLVED_PREFIX}entry/${key}`)
      if (entryMod !== undefined) server.moduleGraph.invalidateModule(entryMod)

      for (const lang of Object.keys(translations)) {
        const langMod = server.moduleGraph.getModuleById(`${RESOLVED_PREFIX}entry/${key}/${lang}`)
        if (langMod !== undefined) server.moduleGraph.invalidateModule(langMod)
      }
    }
  }

  return {
    name: "vue-sfc-i18n",
    enforce: "pre",

    configResolved(config: ResolvedConfig) {
      resolvedSrcDir = srcDir ?? join(config.root, "src")
      resolvedKeysFile = join(resolvedSrcDir, keysFile)
    },

    async buildStart() {
      resolver = async (id, importer) => {
        const r = await this.resolve(id, importer)
        return r?.id ?? null
      }
      await buildAll()
    },

    transform(code, id) {
      if (!id.endsWith(".vue")) return undefined

      let result = code.replaceAll(/<i18n\b[^>]*>[\S\s]*?<\/i18n>/gu, "")
      result = result.replaceAll(/\buseI18n\(\s*(?:'[^']*'|"[^"]*"|`[^`]*`)\s*\)/gu, "useI18n()")

      const entryKey = entryKeyByFile.get(id)
      if (entryKey !== undefined) {
        result = result.replace(/(?<tag><script\b[^>]*>)/u, `$<tag>\nimport 'virtual:i18n/entry/${entryKey}'`)
      }

      return result
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) return RESOLVED_PREFIX + id.slice(VIRTUAL_PREFIX.length)

      return undefined
    },

    load(id) {
      if (!id.startsWith(RESOLVED_PREFIX)) return undefined

      const rest = id.slice(RESOLVED_PREFIX.length)

      if (!rest.startsWith("entry/")) return undefined

      const afterEntry = rest.slice("entry/".length)
      const slash = afterEntry.indexOf("/")

      if (slash !== -1) {
        const key = afterEntry.slice(0, slash)
        const language = afterEntry.slice(slash + 1)
        const translations = entryMap.get(key)
        if (translations === undefined) return undefined
        return `export default ${JSON.stringify(translations[language] ?? {})}`
      }

      const translations = entryMap.get(afterEntry)
      if (translations === undefined) return undefined

      const loaders = Object.keys(translations)
        .map(lang => {
          const virtualPath = JSON.stringify(`virtual:i18n/entry/${afterEntry}/${lang}`)
          return `  ${JSON.stringify(lang)}: () => import(${virtualPath})`
        })
        .join(",\n")

      return [
        "import { manager } from '@vue-sfc-i18n/composable'",
        `const _entry = ${JSON.stringify(afterEntry)}`,
        `const _loaders = {\n${loaders}\n}`,
        "async function _load(language) {",
        "  const _fn = _loaders[language]",
        "  return _fn ? (await _fn()).default : {}",
        "}",
        "await manager.registerEntryLoader(_load)",
        "if (import.meta.hot) {",
        "  import.meta.hot.on('i18n:update', ({ entries }) => {",
        "    const dict = entries[_entry]",
        "    if (dict) for (const [language, data] of Object.entries(dict)) manager.mergeTranslations(data, language)",
        "  })",
        "}",
        "export {}",
      ].join("\n")
    },

    async handleHotUpdate({ file, server }) {
      if (file.endsWith(".vue")) {
        await buildAll()
        invalidateVirtualModules(server)
        server.ws.send({
          type: "custom",
          event: "i18n:update",
          data: { entries: Object.fromEntries(entryMap) },
        })
        return undefined
      }

      const translations = extractTranslations(readFileSync(file, "utf-8"))
      if (Object.keys(translations).length > 0) {
        await buildAll()
        invalidateVirtualModules(server)
        server.ws.send({ type: "full-reload" })
        return []
      }

      return undefined
    },
  }
}
