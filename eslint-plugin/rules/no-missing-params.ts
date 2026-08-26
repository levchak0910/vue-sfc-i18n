import type { Rule } from "eslint"

import { getI18N } from "../utils/get-block.js"
import { getDocumentFragment } from "../utils/get-document-fragment.js"
import { forEachKeyValue } from "../utils/get-language-block-content.js"

type KeyEntry = {
  params: Set<string>
  loc: { end: { column: number; line: number }; start: { column: number; line: number } }
}

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      missingParam: "Key '{{ key }}' in locale '{{ locale }}' is missing param '{{ param }}' (present in {{ otherLocales }}).",
    },
  },
  create (context) {
    return {
      Program () {
        if (!context.filename.endsWith(".vue"))
          return

        const df = getDocumentFragment(context)
        if (df === null)
          return

        const src = context.sourceCode.getText()

        // key → locale → entry
        const byKey = new Map<string, Map<string, KeyEntry>>()

        for (const block of getI18N(context, df)) {
          forEachKeyValue(src, block.contentRange, ({ key, valueParams, keyLoc }) => {
            if (!byKey.has(key))
              byKey.set(key, new Map())

            byKey.get(key)!.set(block.language, {
              params: new Set(valueParams.map(p => p.name)),
              loc: keyLoc,
            })
          })
        }

        for (const [ key, localeMap ] of byKey) {
          if (localeMap.size < 2)
            continue

          // param → locales that use it
          const paramLocales = new Map<string, string[]>()
          for (const [ locale, entry ] of localeMap) {
            for (const param of entry.params) {
              if (!paramLocales.has(param))
                paramLocales.set(param, [])
              
              paramLocales.get(param)!.push(locale)
            }
          }

          for (const [ locale, entry ] of localeMap) {
            for (const [ param, presentIn ] of paramLocales) {
              if (entry.params.has(param))
                continue

              context.report({
                loc: entry.loc,
                messageId: "missingParam",
                data: { key, locale, param, otherLocales: presentIn.join(", ") },
              })
            }
          }
        }
      },
    }
  },
}

export default rule
