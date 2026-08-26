import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

type VueParserServices = {
  getDocumentFragment: () => null | AST.VDocumentFragment
}

export function getDocumentFragment (context: Rule.RuleContext): AST.VDocumentFragment | null {
  const services = context.sourceCode.parserServices as VueParserServices
  return services.getDocumentFragment()
}
