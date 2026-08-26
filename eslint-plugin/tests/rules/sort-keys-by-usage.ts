import rule from "../../rules/sort-keys-by-usage"
import { tester } from "../utils/tester"

const sfc = (usageKeys: string[], i18nLines: string[]) => [
  `<template>`,
  ...usageKeys.map(k => `  <p>{{ t("${k}") }}</p>`),
  `</template>`,
  `<script setup>`,
  `const { t } = useI18n()`,
  `</script>`,
  `<i18n locale="en">`,
  ...i18nLines,
  `</i18n>`,
].join("\n")

tester.run("sort-keys-by-usage", rule, {
  valid: [
    {
      filename: "test.vue",
      code: sfc(["greeting", "farewell"], ["greeting: Hello", "farewell: Goodbye"]),
    },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: sfc(["greeting", "farewell"], ["farewell: Goodbye", "greeting: Hello"]),
      errors: [{
        messageId: "unsorted",
        data: { key: "farewell", language: "en" },
      }],
      output: sfc(["greeting", "farewell"], ["greeting: Hello", "farewell: Goodbye"]),
    },
  ],
})
