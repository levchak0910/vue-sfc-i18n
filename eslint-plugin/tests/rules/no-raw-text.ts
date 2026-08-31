import rule from "../../rules/no-raw-text"
import { tester } from "../utils/tester"

const sfc = (tmpl: string) => `<template>${tmpl}</template>`
const script = (code: string) => `<script>${code}</script>`

tester.run("no-raw-text", rule, {
  valid: [
    // template literals
    { filename: "test.vue", code: sfc("<p>{{ `${a} ${b}` }}</p>") },
    { filename: "test.vue", code: sfc('<p :title="`${expr}`"></p>') },
    { filename: "test.ts", code: "const s = `raw text in non-vue file`" },
    {
      filename: "test.vue",
      code: sfc('<p :title="`prefix${n} ignored text`"></p>'),
      options: [{ ignorePattern: ["^prefix$"], ignoreText: ["ignored text"] }],
    },
    {
      filename: "test.vue",
      code: sfc("<p>{{ `ignored text ${n}` }}</p>"),
      options: [{ ignoreText: ["ignored text"] }],
    },
    // string literals
    { filename: "test.vue", code: sfc("<p>{{ t('key') }}</p>") },
    { filename: "test.vue", code: sfc("<p>{{ `${t('key')}` }}</p>") },
    { filename: "test.ts", code: "const s = 'raw text in non-vue file'" },
    {
      filename: "test.vue",
      code: sfc("<p :title=\"'ignored text'\"></p>"),
      options: [{ ignoreText: ["ignored text"] }],
    },
    {
      filename: "test.vue",
      code: sfc("<p :title=\"'ignored text'\"></p>"),
      options: [{ ignorePattern: ["^ignored"] }],
    },
    // identifier-like values
    { filename: "test.vue", code: sfc("<p>{{ 'word' }}</p>") },
    { filename: "test.vue", code: sfc("<p>{{ 'camelCase' }}</p>") },
    { filename: "test.vue", code: sfc("<p>{{ 'kebab-case' }}</p>") },
    { filename: "test.vue", code: sfc("<p>{{ 'snake_case' }}</p>") },
    { filename: "test.vue", code: sfc("<p>{{ 'SCREAMING_SNAKE_CASE' }}</p>") },
    { filename: "test.vue", code: sfc("<p>{{ 'PascalCase' }}</p>") },
    { filename: "test.vue", code: sfc('<p title="PascalCase" />') },
    { filename: "test.vue", code: sfc('<p title="word" />') },
    { filename: "test.vue", code: sfc('<p title="camelCase" />') },
    { filename: "test.vue", code: sfc('<p title="kebab-case" />') },
    { filename: "test.vue", code: sfc('<p title="snake_case" />') },
    { filename: "test.vue", code: sfc('<p title="SCREAMING_SNAKE_CASE" />') },
    // checkJS off for ts files
    { filename: "test.ts", code: "const s = 'raw text'" },
    { filename: "test.ts", code: "const s = `raw text`" },
    // checkJS off — vue script not checked by default
    { filename: "test.vue", code: script("const s = 'raw text'") },
    { filename: "test.vue", code: script("const s = `raw text`") },
    // checkJS on — ts files still not checked
    { filename: "test.ts", code: "const s = 'raw text'", options: [{ checkJS: true }] },
    // checkJS on — ignored
    {
      filename: "test.vue",
      code: script("const s = 'ignored text'"),
      options: [{ checkJS: true, ignoreText: ["ignored text"] }],
    },
    // import sources excluded (static and dynamic)
    {
      filename: "test.vue",
      code: script("import foo from 'some module'"),
      options: [{ checkJS: true }],
    },
    {
      filename: "test.vue",
      code: script("const m = import('some module')"),
      options: [{ checkJS: true }],
    },
    // querySelector calls excluded
    {
      filename: "test.vue",
      code: script("document.querySelector('.item:nth-child(2) raw text')"),
      options: [{ checkJS: true }],
    },
    {
      filename: "test.vue",
      code: script("el.querySelector('input[type=\"raw text\"]')"),
      options: [{ checkJS: true }],
    },
    // new Error / error subclasses excluded
    {
      filename: "test.vue",
      code: script("throw new Error('raw error message')"),
      options: [{ checkJS: true }],
    },
    {
      filename: "test.vue",
      code: script("throw new TypeError('raw type message')"),
      options: [{ checkJS: true }],
    },
    {
      filename: "test.vue",
      code: script("throw new CustomError('raw custom error')"),
      options: [{ checkJS: true }],
    },
    // ignoreNodes
    {
      filename: "test.vue",
      code: sfc("<p>{{ fn('raw text') }}</p>"),
      options: [{ ignoreNodes: ["CallExpression"] }],
    },
    {
      filename: "test.vue",
      code: sfc("<p>{{ fn(`raw text`) }}</p>"),
      options: [{ ignoreNodes: ["CallExpression"] }],
    },
    {
      filename: "test.vue",
      code: script("fn('raw text')"),
      options: [{ checkJS: true, ignoreNodes: ["CallExpression[callee.name='fn']"] }],
    },
    // VText (element text content)
    { filename: "test.vue", code: sfc("<p>   </p>") },
    { filename: "test.vue", code: sfc("<p>word</p>") },
    { filename: "test.vue", code: sfc("<p>camelCase</p>") },
    {
      filename: "test.vue",
      code: sfc("<p>raw text</p>"),
      options: [{ ignoreText: ["raw text"] }],
    },
    {
      filename: "test.vue",
      code: sfc("<p>raw text</p>"),
      options: [{ ignorePattern: ["^raw"] }],
    },
    // id attribute (default ignored)
    { filename: "test.vue", code: sfc('<p id="raw text" />') },
    { filename: "test.vue", code: sfc("<p :id=\"'raw text'\" />") },
    // VLiteral (static attributes)
    { filename: "test.vue", code: sfc('<p style="color: red" />') },
    { filename: "test.vue", code: sfc('<p class="my-class other-class" />') },
    { filename: "test.vue", code: sfc("<p :style=\"{ '--prop': val }\" />") },
    { filename: "test.vue", code: sfc('<p :class="{ active: flag }" />') },
    { filename: "test.vue", code: sfc('<template #[`${expr}Suffix`]="{ item }"></template>') },
    { filename: "test.vue", code: sfc('<p v-for="item in items" :key="\'static-key\'" />') },
    { filename: "test.vue", code: sfc('<p title="   " />') },
    {
      filename: "test.vue",
      code: sfc('<p title="ignored text" />'),
      options: [{ ignoreText: ["ignored text"] }],
    },
    {
      filename: "test.vue",
      code: sfc('<p title="ignored text" />'),
      options: [{ ignorePattern: ["^ignored"] }],
    },
    // path-like strings excluded
    { filename: "test.vue", code: script("const p = '/absolute/path'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = './relative/path'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = '../parent/path'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = '~/home/path'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = '/api/v1/users'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = 'api/v1/users'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = 'some/path'"), options: [{ checkJS: true }] },
    { filename: "test.vue", code: script("const p = 'C:\\\\Windows\\\\System32'"), options: [{ checkJS: true }] },
    // svg elements excluded
    { filename: "test.vue", code: sfc("<svg><text>Raw label</text></svg>") },
    { filename: "test.vue", code: sfc("<svg><g><text>Nested raw text</text></g></svg>") },
    { filename: "test.vue", code: sfc("<svg><path :d=\"'M 0 0 raw path'\" /></svg>") },
    // comment directives — ignoreText
    {
      filename: "test.vue",
      code: sfc("<!-- @vue-sfc-i18n allowText: raw text -->\n<p>{{ 'raw text' }}</p>"),
    },
    {
      filename: "test.vue",
      code: sfc('<!-- @vue-sfc-i18n allowText: raw text -->\n<p title="raw text" />'),
    },
    // comment directives — ignoreNodes
    {
      filename: "test.vue",
      code: sfc("<!-- @vue-sfc-i18n allowNodes: VElement[rawName='p'] -->\n<p>{{ 'raw text' }}</p>"),
    },
    // ignoreNodes — Vue nodes
    {
      filename: "test.vue",
      code: sfc("<MyComp :title=\"'raw text'\" />"),
      options: [{ ignoreNodes: ["VElement[rawName='MyComp']"] }],
    },
    {
      filename: "test.vue",
      code: sfc("<p :title=\"'raw text'\" />"),
      options: [{ ignoreNodes: ["VAttribute[key.argument.name='title']"] }],
    },
    {
      filename: "test.vue",
      code: sfc('<p title="raw text" />'),
      options: [{ ignoreNodes: ["VAttribute[key.rawName='title']"] }],
    },
  ],
  invalid: [
    // template literals
    {
      filename: "test.vue",
      code: sfc('<p :title="`prefix${expr} raw text`"></p>'),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: sfc("<p>{{ `raw text ${expr} more text` }}</p>"),
      errors: [
        { messageId: "rawText", data: { text: "raw text" } },
        { messageId: "rawText", data: { text: "more text" } },
      ],
    },
    {
      filename: "test.vue",
      code: sfc("<p>{{ `raw text` }}</p>"),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: sfc("<p :title=\"`${t('key')} raw text`\"></p>"),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    // string literals
    {
      filename: "test.vue",
      code: sfc("<p>{{ 'raw text' }}</p>"),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: sfc("<p :title=\"'raw text'\"></p>"),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    // checkJS on
    {
      filename: "test.vue",
      code: script("const s = 'raw text'"),
      options: [{ checkJS: true }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: script("const s = `raw text`"),
      options: [{ checkJS: true }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    // ignoreNodes — non-matching selector still reports
    {
      filename: "test.vue",
      code: sfc("<p>{{ 'raw text' }}</p>"),
      options: [{ ignoreNodes: ["CallExpression"] }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: sfc("<p>{{ `raw text` }}</p>"),
      options: [{ ignoreNodes: ["CallExpression"] }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: script("other('raw text')"),
      options: [{ checkJS: true, ignoreNodes: ["CallExpression[callee.name='fn']"] }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    // single capitalized word is not PascalCase
    {
      filename: "test.vue",
      code: sfc("<p>{{ 'Word' }}</p>"),
      errors: [{ messageId: "rawText", data: { text: "Word" } }],
    },
    // VText (element text content)
    {
      filename: "test.vue",
      code: sfc("<p>raw text</p>"),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    // new SomeHelper — not Error-like, still reported
    {
      filename: "test.vue",
      code: script("throw new Helper('raw helper message')"),
      options: [{ checkJS: true }],
      errors: [{ messageId: "rawText", data: { text: "raw helper message" } }],
    },
    // getElementById — not querySelector, still reported
    {
      filename: "test.vue",
      code: script("document.getElementById('raw id selector')"),
      options: [{ checkJS: true }],
      errors: [{ messageId: "rawText", data: { text: "raw id selector" } }],
    },
    // VLiteral (static attributes)
    {
      filename: "test.vue",
      code: sfc('<p title="raw text" />'),
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    // ignoreNodes — Vue nodes, non-matching
    {
      filename: "test.vue",
      code: sfc("<OtherComp :title=\"'raw text'\" />"),
      options: [{ ignoreNodes: ["VElement[rawName='MyComp']"] }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
    {
      filename: "test.vue",
      code: sfc('<p title="raw text" />'),
      options: [{ ignoreNodes: ["VAttribute[key.rawName='other']"] }],
      errors: [{ messageId: "rawText", data: { text: "raw text" } }],
    },
  ],
})
