import { RuleTester } from "eslint"
import { describe, it } from "vitest"
import * as vueParser from "vue-eslint-parser"

RuleTester.describe = describe
RuleTester.it = it

export const tester = new RuleTester({
  languageOptions: { parser: vueParser },
})
