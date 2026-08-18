import type { Rule } from "eslint"
import { extractTranslations } from "@vue-sfc-i18n/shared"

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

        const code = context.sourceCode.getText()
        const translations = extractTranslations(code)[language]

        // eslint-disable-next-line ts/no-unnecessary-condition -- <i18n> is not used in some .vue files
        if (translations === undefined)
          return

        const lines = code.split("\n")

        for (const [ key, value ] of Object.entries(translations)) {
          if (key === value)
            continue

          const lineIdx = lines.findIndex(l => l.trimStart().startsWith(`${key}:`))
          if (lineIdx === -1)
            continue

          const rawLine = lines[lineIdx]
          const startColumn = Math.max(0, rawLine.indexOf(key))
          const endColumn = startColumn + key.length
          const lineOffset = lines.slice(0, lineIdx).reduce((acc, l) => acc + l.length + 1, 0)

          context.report({
            loc: {
              start: { line: lineIdx + 1, column: startColumn },
              end: { line: lineIdx + 1, column: endColumn },
            },
            messageId: "mismatch",
            data: { key, value, language },
            suggest: [
              {
                messageId: "replaceWithValue",
                data: { value },
                fix: fixer => fixer.replaceTextRange([ lineOffset + startColumn, lineOffset + endColumn ], value),
              },
            ],
          })
        }
      },
    }
  },
}

export default rule
