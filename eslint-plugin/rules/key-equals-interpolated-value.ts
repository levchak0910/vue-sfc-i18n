import type { Rule } from "eslint"

import { getI18N } from "../utils/get-block.js"
import { getDocumentFragment } from "../utils/parser-services.js"
import { forEachKeyValue } from "../utils/get-language-block-content.js"

const toConstantCase = (name: string): string =>
  name.replace(/([A-Z])/g, "_$1").toUpperCase()

const toExpectedKey = (value: string): string =>
  value.replace(/\{([^}]+)\}/g, (_, inner: string) => toConstantCase(inner.trim()))

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          locale: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mismatch: "i18n key '{{ key }}' in language '{{ language }}' must equal its interpolated value template (expected '{{ expected }}').",
      replaceWithExpected: "Replace key with '{{ expected }}'.",
    },
  },
  create (context: Rule.RuleContext) {
    const language: string = (context.options[0] as undefined | { locale?: string })?.locale ?? "en"

    return {
      Program () {
        if (!context.filename.endsWith(".vue"))
          return

        const df = getDocumentFragment(context)
        if (df === null)
          return

        const src = context.sourceCode.getText()
        const i18nBlocks = getI18N(context, df).filter(b => b.language === language)

        for (const block of i18nBlocks) {
          forEachKeyValue(src, block.contentRange, ({ key, value, valueParams, keyLoc }) => {
            if (valueParams.length === 0)
              return

            const expected = toExpectedKey(value)
            if (key === expected)
              return

            context.report({
              loc: keyLoc,
              messageId: "mismatch",
              data: { key, language, expected },
              suggest: [
                {
                  messageId: "replaceWithExpected",
                  data: { expected },
                  fix: fixer => fixer.replaceTextRange(
                    [
                      context.sourceCode.getIndexFromLoc(keyLoc.start),
                      context.sourceCode.getIndexFromLoc(keyLoc.end),
                    ],
                    expected,
                  ),
                },
              ],
            })
          })
        }
      },
    }
  },
}

export default rule
