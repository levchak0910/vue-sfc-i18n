import type { ESLint } from "eslint"

import keyEqualsPlainValue from "./rules/key-equals-plain-value.js"
import keyEqualsInterpolatedValue from "./rules/key-equals-interpolated-value.js"
import noMissingParams from "./rules/no-missing-params.js"
import sortKeysByUsage from "./rules/sort-keys-by-usage.js"
import validParams from "./rules/valid-params.js"

const plugin: ESLint.Plugin = {
  rules: {
    "key-equals-plain-value": keyEqualsPlainValue,
    "key-equals-interpolated-value": keyEqualsInterpolatedValue,
    "no-missing-params": noMissingParams,
    "sort-keys-by-usage": sortKeysByUsage,
    "valid-params": validParams,
  },
}

export default plugin
