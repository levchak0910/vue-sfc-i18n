import type { ESLint } from "eslint"

import keyEqualsValue from "./rules/key-equals-value.js"
import sortKeysByUsage from "./rules/sort-keys-by-usage.js"

const plugin: ESLint.Plugin = {
  rules: {
    "key-equals-value": keyEqualsValue,
    "sort-keys-by-usage": sortKeysByUsage,
  },
}

export default plugin
