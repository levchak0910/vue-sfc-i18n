import type { Rule } from "eslint"
import type { AST } from "vue-eslint-parser"

type ParserServices = {
  getDocumentFragment: () => null | AST.VDocumentFragment
  defineTemplateBodyVisitor: (visitor: Rule.RuleListener, scriptVisitor?: Rule.RuleListener) => Rule.RuleListener
}

function getParserServices (context: Rule.RuleContext): ParserServices {
  return context.sourceCode.parserServices as ParserServices
}

export function getDocumentFragment (context: Rule.RuleContext): AST.VDocumentFragment | null {
  return getParserServices(context).getDocumentFragment()
}

export function defineTemplateBodyVisitor (
  context: Rule.RuleContext,
  visitor: Rule.RuleListener,
  scriptVisitor: Rule.RuleListener = visitor,
): Rule.RuleListener {
  const services = getParserServices(context)
  if (typeof services.defineTemplateBodyVisitor !== "function") return scriptVisitor
  return services.defineTemplateBodyVisitor(visitor, scriptVisitor)
}
