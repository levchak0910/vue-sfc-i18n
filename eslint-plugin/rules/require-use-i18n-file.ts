import * as path from "node:path"

import type { Rule } from "eslint"
import type { CallExpression } from "estree"

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          srcDir: { type: "string" },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingFile: "useI18n() must be called with a file string for type narrowing.",
      notStringLiteral: "useI18n() file argument must be a string literal.",
      wrongFile: "useI18n() path '{{ actual }}' does not match this file's path '{{ expected }}'.",
    },
  },
  create(context) {
    if (!context.filename.endsWith(".vue")) return {}

    return {
      "CallExpression[callee.name='useI18n']"(node: CallExpression) {
        const srcDir: string | undefined = context.options[0]?.srcDir
        const expectedPath = srcDir ? path.relative(srcDir, context.filename).split(path.sep).join("/") : null

        if (node.arguments.length === 0) {
          context.report({
            node,
            messageId: "missingFile",
            fix:
              expectedPath === null
                ? undefined
                : fixer => {
                    const openParen = context.sourceCode.getTokenAfter(node.callee)!
                    return fixer.insertTextAfter(openParen, JSON.stringify(expectedPath))
                  },
          })
          return
        }

        const firstArg = node.arguments[0]

        if (firstArg.type !== "Literal" || typeof firstArg.value !== "string") {
          context.report({ node: firstArg, messageId: "notStringLiteral" })
          return
        }

        if (expectedPath !== null && firstArg.value !== expectedPath) {
          context.report({
            node: firstArg,
            messageId: "wrongFile",
            data: { actual: firstArg.value, expected: expectedPath },
            fix: fixer => fixer.replaceText(firstArg, JSON.stringify(expectedPath)),
          })
        }
      },
    }
  },
}

export default rule
