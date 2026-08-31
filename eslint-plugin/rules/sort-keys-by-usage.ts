import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

import { getI18N } from "../utils/get-block.js"
import { getDocumentFragment } from "../utils/parser-services.js"

const SKIP_KEYS = new Set(["parent", "scope", "tokens", "comments"])

function visit(node: Rule.Node | undefined | null, fn: (n: Rule.Node) => void, seen = new Set<Rule.Node>()): void {
  if (!node) return
  if (seen.has(node)) return

  seen.add(node)
  fn(node)

  for (const [key, val] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) continue
    if (Array.isArray(val)) val.forEach(item => visit(item, fn, seen))
    else visit(val, fn, seen)
  }
}

function extractKeyOrder(context: Rule.RuleContext, df: AST.VDocumentFragment): string[] {
  const keys: string[] = []
  const seen = new Set<string>()

  const collect = (root: Rule.Node) => {
    visit(root, node => {
      if (node.type === "CallExpression" && node.callee.type === "Identifier" && node.callee.name === "t") {
        const arg = node.arguments[0]
        if (arg?.type === "Literal" && typeof arg.value === "string" && !seen.has(arg.value)) {
          seen.add(arg.value)
          keys.push(arg.value)
        }
      }
    })
  }

  const template = df.children.find(n => n.type === "VElement" && n.name === "template")
  if (template) collect(template as unknown as Rule.Node)
  collect(context.sourceCode.ast as unknown as Rule.Node)

  return keys
}

function parseYamlLineKey(line: string): null | string {
  const trimmed = line.trim()
  if (trimmed === "" || trimmed.startsWith("#")) return null

  const parts = trimmed.split(": ")
  if (parts.length === 2) return parts[0]

  return null
}

function analyzeYaml(content: string, usageOrder: string[]): null | { reordered: string; firstMismatchKey: string } {
  const keyToLine = new Map<string, string>()
  const currentOrder: string[] = []

  for (const line of content.split("\n")) {
    const key = parseYamlLineKey(line)
    if (key !== null) {
      keyToLine.set(key, line)
      currentOrder.push(key)
    }
  }

  if (currentOrder.length === 0) return null

  const sorted = [...usageOrder.filter(k => keyToLine.has(k)), ...currentOrder.filter(k => !usageOrder.includes(k))]

  const firstMismatchIdx = currentOrder.findIndex((k, i) => k !== sorted[i])
  if (firstMismatchIdx === -1) return null

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
  create(context) {
    return {
      Program() {
        if (!context.filename.endsWith(".vue")) return

        const df = getDocumentFragment(context)
        if (df === null) return

        const i18nBlocks = getI18N(context, df)

        const usageOrder = extractKeyOrder(context, df)
        if (usageOrder.length === 0) return

        for (const block of i18nBlocks) {
          const result = analyzeYaml(block.content, usageOrder)
          if (result === null) continue

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
