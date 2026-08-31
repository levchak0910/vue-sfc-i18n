import type { ESLint } from "eslint"

import keyEqualsInterpolatedValue from "./rules/key-equals-interpolated-value.js"
import keyEqualsPlainValue from "./rules/key-equals-plain-value.js"
import keyEqualsPluralValue from "./rules/key-equals-plural-value.js"
import noMissingParams from "./rules/no-missing-params.js"
import noRawText from "./rules/no-raw-text.js"
import requireUseI18nFile from "./rules/require-use-i18n-file.js"
import sortKeysByUsage from "./rules/sort-keys-by-usage.js"
import validParams from "./rules/valid-params.js"

const plugin: ESLint.Plugin = {
  rules: {
    "key-equals-plain-value": keyEqualsPlainValue,
    "key-equals-interpolated-value": keyEqualsInterpolatedValue,
    "key-equals-plural-value": keyEqualsPluralValue,
    "no-missing-params": noMissingParams,
    "sort-keys-by-usage": sortKeysByUsage,
    "valid-params": validParams,
    "no-raw-text": noRawText,
    "require-use-i18n-file": requireUseI18nFile,
  },
}

export default plugin
