import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

type Expose = { content: string, contentRange: [number, number], contentLine: number }

const getContentRange = (node: AST.VElement | AST.VExpressionContainer | AST.VStyleElement | AST.VText): [number, number] => {
  if (node.type !== "VElement")
    return [ 0, 0 ]

  return [
    node.startTag.range[1],
    node.endTag?.range[0] ?? node.startTag.range[1],
  ]
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
    contentRange: getContentRange(template),
    contentLine: getContentLine(template),
  }
}

export function getScripts (context: Rule.RuleContext, df: AST.VDocumentFragment): Expose[] {
  const scripts = df.children.filter(child => child.type === "VElement" && child.name === "script")

  return scripts.map(script => ({
    // @ts-expect-error -- element is eslint node compatible but has problems with typings
    content: context.sourceCode.getText(script),
    contentRange: getContentRange(script),
    contentLine: getContentLine(script),
  }))
}

export function getI18N (context: Rule.RuleContext, df: AST.VDocumentFragment): Array<Expose & { language: string }> {
  const i18n = df.children.filter(child => child.type === "VElement" && child.name === "i18n")

  return i18n.map(block => ({
    // @ts-expect-error -- element is eslint node compatible but has problems with typings
    content: context.sourceCode.getText(block),
    contentRange: getContentRange(block),
    contentLine: getContentLine(block),
    language: ((block as AST.VElement).startTag.attributes.find(a => a.key.name === "locale")?.value as undefined | AST.VLiteral)?.value ?? "",
  }))
}
