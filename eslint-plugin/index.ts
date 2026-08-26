import type { ESLint } from "eslint"

import keyEqualsValue from "./rules/key-equals-value.js"
import keyEqualsInterpolatedValue from "./rules/key-equals-interpolated-value.js"
import noMissingParams from "./rules/no-missing-params.js"
import sortKeysByUsage from "./rules/sort-keys-by-usage.js"
import validParams from "./rules/valid-params.js"

const plugin: ESLint.Plugin = {
  rules: {
    "key-equals-value": keyEqualsValue,
    "key-equals-interpolated-value": keyEqualsInterpolatedValue,
    "no-missing-params": noMissingParams,
    "sort-keys-by-usage": sortKeysByUsage,
    "valid-params": validParams,
  },
}

export default plugin
