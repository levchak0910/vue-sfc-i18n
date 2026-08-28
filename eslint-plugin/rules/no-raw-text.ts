import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

import { defineTemplateBodyVisitor } from "../utils/parser-services.js"
import { isParent } from "../utils/parent.js"
import { getPluginComments } from "../utils/comments.js"

const hasOnlyWhitespace = (value: string) => /^[\r\n\s\t\f\v]*$/.test(value)

const isIdentifierLike = (value: string) =>
  /^[a-z][a-z0-9]*$/.test(value) ||                        // single word
  /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/.test(value) ||    // camelCase
  /^[a-z][a-z0-9]*(-+[a-z0-9]+)+$/.test(value) ||          // kebab-case
  /^[a-z][a-z0-9]*(_+[a-z0-9]+)+$/.test(value) ||          // snake_case
  /^[A-Z][a-z0-9]*([A-Z][a-zA-Z0-9]*)+$/.test(value) ||    // PascalCase (2+ words)
  /^[A-Z][A-Z0-9]*(_+[A-Z0-9]+)+$/.test(value)             // SCREAMING_SNAKE_CASE

function isTranslationCall (node: Rule.Node): boolean {
  const p = node.parent
  return p?.type === "CallExpression" && p.callee.type === "Identifier" && p.callee.name === "t"
}

function isImportSource (node: Rule.Node): boolean {
  return node.parent?.type === "ImportDeclaration"
}

function isRawText (value: string, ignorePattern: RegExp[], ignoreText: string[]): boolean {
  const trimmed = value.trim()
  return !(
    hasOnlyWhitespace(value) ||
    isIdentifierLike(trimmed) ||
    ignorePattern.some(re => re.test(trimmed)) ||
    ignoreText.includes(trimmed)
  )
}

function parseCommentDirectives (context: Rule.RuleContext): { allowText: string[]; allowNodes: string[] } {
  const allowText: string[] = []
  const allowNodes: string[] = []

  for (const comment of getPluginComments(context)) {
    if (comment.name === "allowText") allowText.push(comment.value)
    else if (comment.name === "allowNodes") allowNodes.push(comment.value)
  }

  return { allowText, allowNodes }
}


const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    schema: [
      {
        type: "object",
        properties: {
          ignorePattern: { type: "array", items: { type: "string" } },
          ignoreText: { type: "array", items: { type: "string" } },
          ignoreNodes: { type: "array", items: { type: "string" } },
          checkJS: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawText: "Raw text '{{ text }}' is hardcoded. Use t() for translatable strings.",
    },
  },
  create (context) {
    if (!context.filename.endsWith(".vue")) return {}

    const ignorePattern: RegExp[] = context.options[0]?.ignorePattern?.map((p: string) => new RegExp(p, "u")) ?? []
    const optionIgnoreText: string[] = context.options[0]?.ignoreText ?? []
    const optionIgnoreNodes: string[] = [
      ...[
        "style",
        "class",
        "key",
        "data-allow-mismatch",
      ].flatMap(attr => [`VAttribute[key.rawName='${attr}']`, `VAttribute[key.argument.rawName='${attr}']`]),
      "VDirectiveKey",
      ...(context.options[0]?.ignoreNodes ?? []),
    ]

    const checkJS = context.options[0]?.checkJS ?? false

    const { allowText: commentIgnoreText, allowNodes: commentIgnoreNodes } = parseCommentDirectives(context)
    const ignoreText = [...optionIgnoreText, ...commentIgnoreText]
    const ignoreNodes = [...optionIgnoreNodes, ...commentIgnoreNodes]

    const templateVisitors = {
      VLiteral (node: AST.VLiteral) {
        const ruleNode = node as unknown as Rule.Node
        if (!isRawText(node.value, ignorePattern, ignoreText)) return
        if (isParent(ruleNode, ignoreNodes)) return
        context.report({ node: ruleNode, messageId: "rawText", data: { text: node.value.trim() } })
      },
      VText (node: AST.VText) {
        if (!isRawText(node.value, ignorePattern, ignoreText)) return
        if (isParent(node, ignoreNodes)) return
        context.report({ node, messageId: "rawText", data: { text: node.value.trim() } })
      },
    } as unknown as Rule.RuleListener

    const visitors: Rule.RuleListener = {
      Literal (node) {
        if (typeof node.value !== "string") return
        if (isTranslationCall(node)) return
        if (isImportSource(node)) return
        if (!isRawText(node.value, ignorePattern, ignoreText)) return
        if (isParent(node, ignoreNodes)) return
        context.report({ node, messageId: "rawText", data: { text: node.value.trim() } })
      },
      TemplateLiteral (node) {
        if (isParent(node, ignoreNodes)) return
        for (const quasi of node.quasis) {
          const text = quasi.value.cooked ?? quasi.value.raw
          if (!isRawText(text, ignorePattern, ignoreText)) continue
          context.report({ node: quasi, messageId: "rawText", data: { text: text.trim() } })
        }
      },
    }

    return defineTemplateBodyVisitor(
      context,
      { ...templateVisitors, ...visitors },
      checkJS ? visitors : {},
    )
  },
}

export default rule
