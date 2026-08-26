import rule from "../../rules/key-equals-interpolated-value"
import { tester } from "../utils/tester"

const withI18n = (locale: string, content: string[]) =>
  `<template><div/></template>\n<i18n locale="${locale}">\n${content.join("\n")}\n</i18n>`

tester.run("key-equals-interpolated-value", rule, {
  valid: [
    { filename: "test.vue", code: withI18n("en", ["Hello, NAME!: Hello, {name}!"]) },
    { filename: "test.vue", code: withI18n("en", ["Hello, SOME_NAME!: Hello, {someName}!"]) },
    { filename: "test.vue", code: withI18n("en", ["COUNT items: {count} items"]) },
    { filename: "test.vue", code: withI18n("en", ["greeting: greeting"]) },
    { filename: "test.vue", code: `<template><div/></template>` },
    { filename: "test.ts", code: "const x = 1" },
    {
      filename: "test.vue",
      code: withI18n("hu", ["Helló, NAME!: Helló, {name}!"]),
      options: [{ locale: "hu" }],
    },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {name}!"]),
      errors: [{
        messageId: "mismatch",
        data: { key: "greeting", language: "en", expected: "Hello, NAME!" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("en", ["Hello, NAME!: Hello, {name}!"]),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {someName}!"]),
      errors: [{
        messageId: "mismatch",
        data: { key: "greeting", language: "en", expected: "Hello, SOME_NAME!" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("en", ["Hello, SOME_NAME!: Hello, {someName}!"]),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {name}!", "farewell: Goodbye"]),
      errors: [{
        messageId: "mismatch",
        data: { key: "greeting", language: "en", expected: "Hello, NAME!" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("en", ["Hello, NAME!: Hello, {name}!", "farewell: Goodbye"]),
        }],
      }],
    },
  ],
})
