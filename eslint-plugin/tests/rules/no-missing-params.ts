import rule from "../../rules/no-missing-params"
import { tester } from "../utils/tester"

type Block = { locale: string; content: string[] }

const sfc = (blocks: Block[]) => [
  `<template><div/></template>`,
  ...blocks.map(b => [
    `<i18n locale="${b.locale}">`,
    ...b.content,
    `</i18n>`,
  ].join("\n")),
].join("\n")

tester.run("no-missing-params", rule, {
  valid: [
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello, {name}!"] },
        { locale: "hu", content: ["greeting: Helló, {name}!"] },
      ]),
    },
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello"] },
        { locale: "hu", content: ["greeting: Helló"] },
      ]),
    },
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello, {name}!"] },
      ]),
    },
    { filename: "test.vue", code: `<template><div/></template>` },
    { filename: "test.ts", code: "const x = 1" },
  ],
  invalid: [
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello, {name}!"] },
        { locale: "hu", content: ["greeting: Helló!"] },
      ]),
      errors: [{
        messageId: "missingParam",
        data: { key: "greeting", locale: "hu", param: "name", otherLocales: "en" },
      }],
    },
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["msg: {a} and {b}"] },
        { locale: "hu", content: ["msg: {a} és valami"] },
      ]),
      errors: [{
        messageId: "missingParam",
        data: { key: "msg", locale: "hu", param: "b", otherLocales: "en" },
      }],
    },
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello, {name}!", "farewell: Goodbye"] },
        { locale: "hu", content: ["greeting: Helló!", "farewell: Viszlát"] },
      ]),
      errors: [{
        messageId: "missingParam",
        data: { key: "greeting", locale: "hu", param: "name", otherLocales: "en" },
      }],
    },
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello, {name}!"] },
        { locale: "hu", content: ["greeting: Helló!"] },
        { locale: "fr", content: ["greeting: Bonjour!"] },
      ]),
      errors: [
        {
          messageId: "missingParam",
          data: { key: "greeting", locale: "hu", param: "name", otherLocales: "en" },
        },
        {
          messageId: "missingParam",
          data: { key: "greeting", locale: "fr", param: "name", otherLocales: "en" },
        },
      ],
    },
    {
      filename: "test.vue",
      code: sfc([
        { locale: "en", content: ["greeting: Hello, {user-name}!"] },
        { locale: "hu", content: ["greeting: Helló, {name}!"] },
      ]),
      errors: [
        {
          messageId: "missingParam",
          data: { key: "greeting", locale: "en", param: "name", otherLocales: "hu" },
        },
        {
          messageId: "missingParam",
          data: { key: "greeting", locale: "hu", param: "user-name", otherLocales: "en" },
        },
      ],
    },
  ],
})
