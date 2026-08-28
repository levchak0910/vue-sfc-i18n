import type { Rule } from "eslint"

import { getI18N, getScripts, getTemplate } from "../utils/get-block.js"
import { getDocumentFragment } from "../utils/parser-services.js"

function extractKeyOrder (templateSource: string, scriptSource: string): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  const re = /\bt\((?:"(?<dq>[^"]+)"|'(?<sq>[^']+)')\)/gu

  const collect = (text: string) => {
    for (const m of text.matchAll(re)) {
      const key = m.groups?.dq ?? m.groups?.sq
      if (key === undefined || seen.has(key))
        continue
      seen.add(key)
      keys.push(key)
    }
  }

  collect(templateSource)
  collect(scriptSource)

  return keys
}

function parseYamlLineKey (line: string): null | string {
  const trimmed = line.trim()
  if (trimmed === "" || trimmed.startsWith("#"))
    return null

  const parts = trimmed.split(": ")
  if (parts.length === 2)
    return parts[0]

  return null
}

function analyzeYaml (
  content: string,
  usageOrder: string[],
): null | { reordered: string, firstMismatchKey: string } {
  const keyToLine = new Map<string, string>()
  const currentOrder: string[] = []

  for (const line of content.split("\n")) {
    const key = parseYamlLineKey(line)
    if (key !== null) {
      keyToLine.set(key, line)
      currentOrder.push(key)
    }
  }

  if (currentOrder.length === 0)
    return null

  const sorted = [
    ...usageOrder.filter(k => keyToLine.has(k)),
    ...currentOrder.filter(k => !usageOrder.includes(k)),
  ]

  const firstMismatchIdx = currentOrder.findIndex((k, i) => k !== sorted[i])
  if (firstMismatchIdx === -1)
    return null

  return {
    reordered: sorted.map(k => keyToLine.get(k) ?? "").join("\n"),
    firstMismatchKey: currentOrder[firstMismatchIdx] ?? "",
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      unsorted: "i18n key '{{ key }}' is out of order in '{{ language }}' block.",
    },
  },
  create (context) {
    return {
      Program () {
        if (!context.filename.endsWith(".vue"))
          return

        const df = getDocumentFragment(context)
        if (df === null)
          return

        const templateText = getTemplate(context, df)?.content ?? ""
        const scriptText = getScripts(context, df).map(s => s.content).join("\n")
        const i18nBlocks = getI18N(context, df)

        const usageOrder = extractKeyOrder(templateText, scriptText)
        if (usageOrder.length === 0)
          return

        for (const block of i18nBlocks) {
          const result = analyzeYaml(block.content, usageOrder)
          if (result === null)
            continue

          const { reordered, firstMismatchKey } = result
          const mismatchIndex = block.content.split("\n").findIndex(l => l.startsWith(`${firstMismatchKey}: `))

          context.report({
            loc: {
              start: { line: block.contentLine + mismatchIndex, column: 0 },
              end: { line: block.contentLine + mismatchIndex, column: firstMismatchKey.length },
            },
            messageId: "unsorted",
            data: { key: firstMismatchKey, language: block.language },
            fix: fixer => fixer.replaceTextRange(block.contentRange, reordered),
          })
        }
      },
    }
  },
}

export default rule
