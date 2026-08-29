import type { Rule } from "eslint"

import { getI18N } from "../utils/get-block.js"
import { getDocumentFragment } from "../utils/parser-services.js"
import { forEachKeyValue } from "../utils/get-language-block-content.js"

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
      mismatch: "i18n key '{{ key }}' in language '{{ language }}' must equal its value (got '{{ value }}').",
      replaceWithValue: "Replace key with '{{ value }}'.",
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
            if (value.includes("|") || valueParams.length > 0 || key === value)
              return

            context.report({
              loc: keyLoc,
              messageId: "mismatch",
              data: { key, value, language },
              suggest: [
                {
                  messageId: "replaceWithValue",
                  data: { value },
                  fix: fixer => fixer.replaceTextRange(
                    [
                      context.sourceCode.getIndexFromLoc(keyLoc.start),
                      context.sourceCode.getIndexFromLoc(keyLoc.end),
                    ],
                    value,
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
