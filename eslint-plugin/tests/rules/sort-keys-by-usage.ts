import rule from "../../rules/sort-keys-by-usage"
import { tester } from "../utils/tester"

const sfc = (usageKeys: string[], i18nLines: string[]) =>
  [
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

const sfcWithParam = (param: string, usageKeys: string[], i18nLines: string[]) =>
  [
    `<template>`,
    ...usageKeys.map(k => `  <p>{{ t("${k}", { ${param}: item }) }}</p>`),
    `</template>`,
    `<script setup>`,
    `const { t } = useI18n()`,
    `const item = "World!"`,
    `</script>`,
    `<i18n locale="en">`,
    ...i18nLines,
    `</i18n>`,
  ].join("\n")

const sfcWithNumber = (usageKeys: string[], i18nLines: string[]) =>
  [
    `<template>`,
    ...usageKeys.map(k => `  <p>{{ t("${k}", n) }}</p>`),
    `</template>`,
    `<script setup>`,
    `const { t } = useI18n()`,
    `const n = 10`,
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
    {
      // t() with params: keys in correct usage order
      filename: "test.vue",
      code: sfcWithParam("name", ["greeting", "farewell"], ["greeting: Hello {name}", "farewell: Goodbye"]),
    },
    {
      // t() with number: keys in correct usage order
      filename: "test.vue",
      code: sfcWithNumber(["greeting", "farewell"], ["greeting: Hello | Hi all", "farewell: Goodbye | Bye all"]),
    },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: sfc(["greeting", "farewell"], ["farewell: Goodbye", "greeting: Hello"]),
      errors: [
        {
          messageId: "unsorted",
          data: { key: "farewell", language: "en" },
        },
      ],
      output: sfc(["greeting", "farewell"], ["greeting: Hello", "farewell: Goodbye"]),
    },
    {
      // t() with params: keys out of usage order must be reordered
      filename: "test.vue",
      code: sfcWithParam("name", ["greeting", "farewell"], ["farewell: Goodbye", "greeting: Hello {name}"]),
      errors: [
        {
          messageId: "unsorted",
          data: { key: "farewell", language: "en" },
        },
      ],
      output: sfcWithParam("name", ["greeting", "farewell"], ["greeting: Hello {name}", "farewell: Goodbye"]),
    },
    {
      // t() with number: keys out of usage order must be reordered
      filename: "test.vue",
      code: sfcWithNumber(["greeting", "farewell"], ["farewell: Goodbye | Bye all", "greeting: Hello | Hi all"]),
      errors: [
        {
          messageId: "unsorted",
          data: { key: "farewell", language: "en" },
        },
      ],
      output: sfcWithNumber(["greeting", "farewell"], ["greeting: Hello | Hi all", "farewell: Goodbye | Bye all"]),
    },
  ],
})
