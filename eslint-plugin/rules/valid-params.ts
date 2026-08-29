import type { Rule } from "eslint"

import { getI18N } from "../utils/get-block.js"
import { getDocumentFragment } from "../utils/parser-services.js"
import { forEachKeyValue } from "../utils/get-language-block-content.js"

type Spacing = "always" | "never"

const CAMEL_CASE_RE = /^[a-z][a-zA-Z0-9]*$/

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          spacing: { type: "string", enum: [ "never", "always" ] },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      notCamelCase: "Interpolation param '{{ name }}' must be camelCase.",
      spacingNever: "Remove spaces around interpolation param: use '{{{ name }}}'.",
      spacingAlways: "Add spaces around interpolation param: use '{ {{ name }} }'.",
      pluralOnlyN: "Pluralized values only allow '{n}' as interpolation param, got '{{ name }}'.",
    },
  },
  create (context) {
    const spacing: Spacing = (context.options[0] as undefined | { spacing?: Spacing })?.spacing ?? "never"

    return {
      Program () {
        if (!context.filename.endsWith(".vue"))
          return

        const df = getDocumentFragment(context)
        if (df === null)
          return

        const src = context.sourceCode.getText()

        for (const block of getI18N(context, df)) {
          forEachKeyValue(src, block.contentRange, ({ value, valueParams }) => {
            const isPlural = value.includes("|")

            for (const param of valueParams) {
              if (isPlural && param.name !== "n") {
                context.report({ loc: param.loc, messageId: "pluralOnlyN", data: { name: param.name } })
                continue
              }

              if (!isPlural && !CAMEL_CASE_RE.test(param.name)) {
                context.report({ loc: param.loc, messageId: "notCamelCase", data: { name: param.name } })
                continue
              }

              const placeholderLen = param.loc.end.column - param.loc.start.column
              const expectedLen = spacing === "always" ? param.name.length + 4 : param.name.length + 2
              const correctParam = spacing === "always" ? `{ ${param.name} }` : `{${param.name}}`

              if (placeholderLen !== expectedLen) {
                context.report({
                  loc: param.loc,
                  messageId: spacing === "always" ? "spacingAlways" : "spacingNever",
                  data: { name: param.name },
                  fix: fixer => fixer.replaceTextRange(
                    [ context.sourceCode.getIndexFromLoc(param.loc.start), context.sourceCode.getIndexFromLoc(param.loc.end) ],
                    correctParam,
                  ),
                })
              }
            }
          })
        }
      },
    }
  },
}

export default rule
