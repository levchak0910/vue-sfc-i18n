import rule from "../../rules/valid-params"
import { tester } from "../utils/tester"

const withI18n = (locale: string, content: string[]) =>
  `<template><div/></template>\n<i18n locale="${locale}">\n${content.join("\n")}\n</i18n>`

tester.run("valid-params", rule, {
  valid: [
    { filename: "test.vue", code: withI18n("en", ["greeting: Hello"]) },
    { filename: "test.vue", code: withI18n("en", ["greeting: Hello, {name}!"]) },
    { filename: "test.vue", code: withI18n("en", ["greeting: Hello, {userName}!"]) },
    { filename: "test.vue", code: withI18n("en", ["count: {count1} items"]) },
    { filename: "test.vue", code: withI18n("en", ["msg: {a} and {b}"]) },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, { name }!"]),
      options: [{ spacing: "always" }],
    },
    { filename: "test.vue", code: `<template><div/></template>` },
    { filename: "test.ts", code: "const x = 1" },
    { filename: "test.vue", code: withI18n("en", ["N items: one item | {n} items"]) },
    { filename: "test.vue", code: withI18n("en", ["many items: one item | many items"]) },
    {
      filename: "test.vue",
      code: withI18n("en", ["N items: one item | { n } items"]),
      options: [{ spacing: "always" }],
    },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {Name}!"]),
      errors: [{ messageId: "notCamelCase", data: { name: "Name" } }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {user_name}!"]),
      errors: [{ messageId: "notCamelCase", data: { name: "user_name" } }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {user-name}!"]),
      errors: [{ messageId: "notCamelCase", data: { name: "user-name" } }],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, { name }!"]),
      errors: [{ messageId: "spacingNever", data: { name: "name" } }],
      output: withI18n("en", ["greeting: Hello, {name}!"]),
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {name}!"]),
      options: [{ spacing: "always" }],
      errors: [{ messageId: "spacingAlways", data: { name: "name" } }],
      output: withI18n("en", ["greeting: Hello, { name }!"]),
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, { name }!", "farewell: Bye, { world }!"]),
      errors: [
        { messageId: "spacingNever", data: { name: "name" } },
        { messageId: "spacingNever", data: { name: "world" } },
      ],
      output: withI18n("en", ["greeting: Hello, {name}!", "farewell: Bye, {world}!"]),
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {Name}!", "farewell: Bye, { world }!"]),
      errors: [
        { messageId: "notCamelCase", data: { name: "Name" } },
        { messageId: "spacingNever", data: { name: "world" } },
      ],
      output: withI18n("en", ["greeting: Hello, {Name}!", "farewell: Bye, {world}!"]),
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["greeting: Hello, {Name} and {Age}!"]),
      errors: [
        { messageId: "notCamelCase", data: { name: "Name" } },
        { messageId: "notCamelCase", data: { name: "Age" } },
      ],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["items: one {count} item | {count} items"]),
      errors: [
        { messageId: "pluralOnlyN", data: { name: "count" } },
        { messageId: "pluralOnlyN", data: { name: "count" } },
      ],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["items: one {name} item | {n} items"]),
      errors: [
        { messageId: "pluralOnlyN", data: { name: "name" } },
      ],
    },
    {
      filename: "test.vue",
      code: withI18n("en", ["N items: one item | { n } items"]),
      errors: [{ messageId: "spacingNever", data: { name: "n" } }],
      output: withI18n("en", ["N items: one item | {n} items"]),
    },
  ],
})
