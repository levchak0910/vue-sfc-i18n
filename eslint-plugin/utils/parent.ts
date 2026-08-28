import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"
import esquery from "esquery"

export function isParent (node: Rule.Node | AST.Node, selectors: string[]): boolean {
  const parsed = selectors.map(s => esquery.parse(s))
  let current: Rule.Node | null = node.parent as Rule.Node | null
  while (current != null) {
    if (parsed.some(sel => esquery.matches(current!, sel))) return true
    current = current.parent as Rule.Node | null
  }
  return false
}
