import rule from "../../rules/key-equals-value"
import { tester } from "../utils/tester"

const withI18n = (locale: string, content: string) =>
  `<template><div/></template>\n<i18n locale="${locale}">\n${content}\n</i18n>`

tester.run("key-equals-value", rule, {
  valid: [
    { filename: "test.vue", code: withI18n("en", "greeting: greeting") },
    { filename: "test.vue", code: `<template><div/></template>` },
    {
      filename: "test.vue",
      code: withI18n("hu", "farewell: farewell"),
      options: [{ locale: "hu" }],
    },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: withI18n("en", "greeting: Hello World"),
      errors: [{
        messageId: "mismatch",
        data: { key: "greeting", value: "Hello World", language: "en" },
        suggestions: [{
          messageId: "replaceWithValue",
          output: withI18n("en", "Hello World: Hello World"),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", "greeting: greeting\nfarewell: Goodbye"),
      errors: [{
        messageId: "mismatch",
        data: { key: "farewell", value: "Goodbye", language: "en" },
        suggestions: [{
          messageId: "replaceWithValue",
          output: withI18n("en", "greeting: greeting\nGoodbye: Goodbye"),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("hu", "farewell: Viszlát"),
      options: [{ locale: "hu" }],
      errors: [{
        messageId: "mismatch",
        data: { key: "farewell", value: "Viszlát", language: "hu" },
        suggestions: [{
          messageId: "replaceWithValue",
          output: withI18n("hu", "Viszlát: Viszlát"),
        }],
      }],
    },
  ],
})
