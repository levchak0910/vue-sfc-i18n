import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

type Expose = { content: string, contentRange: [number, number], contentLine: number }

const getContentRange = (node: AST.VElement | AST.VExpressionContainer | AST.VStyleElement | AST.VText, src: string): [number, number] => {
  if (node.type !== "VElement")
    return [ 0, 0 ]

  const start = node.startTag.range[1]
  const end = node.endTag?.range[0] ?? start
  const inner = src.slice(start, end)
  const leadingLen = /^\s*/.exec(inner)?.[0].length ?? 0
  const trailingLen = /\s*$/.exec(inner)?.[0].length ?? 0
  return [ start + leadingLen, end - trailingLen ]
}
const getContentLine = (node: AST.VElement | AST.VExpressionContainer | AST.VStyleElement | AST.VText): number => (
  node.loc.start.line
)

export function getTemplate (context: Rule.RuleContext, df: AST.VDocumentFragment): null | Expose {
  const template = df.children.find(child => child.type === "VElement" && child.name === "template")

  if (template?.type !== "VElement")
    return null

  return {
    // @ts-expect-error -- element is eslint node compatible but has problems with typings
    content: context.sourceCode.getText(template),
    contentRange: getContentRange(template, context.sourceCode.getText()),
    contentLine: getContentLine(template),
  }
}

export function getScripts (context: Rule.RuleContext, df: AST.VDocumentFragment): Expose[] {
  const scripts = df.children.filter(child => child.type === "VElement" && child.name === "script")

  return scripts.map(script => ({
    // @ts-expect-error -- element is eslint node compatible but has problems with typings
    content: context.sourceCode.getText(script),
    contentRange: getContentRange(script, context.sourceCode.getText()),
    contentLine: getContentLine(script),
  }))
}

export function getI18N (context: Rule.RuleContext, df: AST.VDocumentFragment): Array<Expose & { language: string }> {
  const i18n = df.children.filter(child => child.type === "VElement" && child.name === "i18n")

  return i18n.map(block => ({
    // @ts-expect-error -- element is eslint node compatible but has problems with typings
    content: context.sourceCode.getText(block),
    contentRange: getContentRange(block, context.sourceCode.getText()),
    contentLine: getContentLine(block),
    language: ((block as AST.VElement).startTag.attributes.find(a => a.key.name === "locale")?.value as undefined | AST.VLiteral)?.value ?? "",
  }))
}
