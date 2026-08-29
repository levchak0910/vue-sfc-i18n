import rule from "../../rules/key-equals-plural-value"
import { tester } from "../utils/tester"

const withI18n = (locale: string, content: string[]) =>
  `<template><div/></template>\n<i18n locale="${locale}">\n${content.join("\n")}\n</i18n>`

tester.run("key-equals-plural-value", rule, {
  valid: [
    // plain plural — key equals last variant
    { filename: "test.vue", code: withI18n("en", ["many items: one item | many items"]) },
    // plural with {n} — key equals last variant with {n} → N
    { filename: "test.vue", code: withI18n("en", ["N items: one item | {n} items"]) },
    // three variants — key equals the last one
    { filename: "test.vue", code: withI18n("en", ["N items: one item | few items | {n} items"]) },
    // non-plural values are ignored
    { filename: "test.vue", code: withI18n("en", ["greeting: Hello"]) },
    // non-.vue file is skipped
    { filename: "test.ts", code: "const x = 1" },
    // no i18n block
    { filename: "test.vue", code: `<template><div/></template>` },
    // locale option respected — other locale not checked
    {
      filename: "test.vue",
      code: withI18n("uk", ["багато елементів: один елемент | багато елементів"]),
      options: [{ locale: "uk" }],
    },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: withI18n("en", ["items: one item | many items"]),
      errors: [{
        messageId: "mismatch",
        data: { key: "items", language: "en", expected: "many items" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("en", ["many items: one item | many items"]),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["items: one item | {n} items"]),
      errors: [{
        messageId: "mismatch",
        data: { key: "items", language: "en", expected: "N items" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("en", ["N items: one item | {n} items"]),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["items: one item | {n} items", "greeting: greeting"]),
      errors: [{
        messageId: "mismatch",
        data: { key: "items", language: "en", expected: "N items" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("en", ["N items: one item | {n} items", "greeting: greeting"]),
        }],
      }],
    },
    {
      filename: "test.vue",
      code: withI18n("uk", ["items: один елемент | багато елементів"]),
      options: [{ locale: "uk" }],
      errors: [{
        messageId: "mismatch",
        data: { key: "items", language: "uk", expected: "багато елементів" },
        suggestions: [{
          messageId: "replaceWithExpected",
          output: withI18n("uk", ["багато елементів: один елемент | багато елементів"]),
        }],
      }],
    },
  ],
})
