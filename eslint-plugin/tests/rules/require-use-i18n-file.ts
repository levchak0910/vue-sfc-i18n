import rule from "../../rules/require-use-i18n-file"
import { tester } from "../utils/tester"

const script = (code: string) => `<script>${code}</script>`

tester.run("require-use-i18n-file", rule, {
  valid: [
    // string literal argument matching the file — valid
    {
      filename: "/project/src/components/a.vue",
      code: script("const { t } = useI18n('components/a.vue')"),
      options: [{ srcDir: "/project/src" }],
    },
    {
      filename: "/project/src/views/Home.vue",
      code: script('const { t } = useI18n("views/Home.vue")'),
      options: [{ srcDir: "/project/src" }],
    },
    // no srcDir — any string is accepted
    { filename: "test.vue", code: script("const { t } = useI18n('whatever')") },
    // non-vue files — not checked
    { filename: "test.ts", code: "const { t } = useI18n()" },
    { filename: "test.ts", code: "const { t } = useI18n(someVar)" },
  ],
  invalid: [
    // no argument
    {
      filename: "test.vue",
      code: script("const { t } = useI18n()"),
      errors: [{ messageId: "missingFile" }],
    },
    // no argument — fix with srcDir
    {
      filename: "/project/src/views/Home.vue",
      code: script("const { t } = useI18n()"),
      options: [{ srcDir: "/project/src" }],
      errors: [{ messageId: "missingFile" }],
      output: script('const { t } = useI18n("views/Home.vue")'),
    },
    {
      filename: "/project/src/components/AppHeader.vue",
      code: script("const { t } = useI18n()"),
      options: [{ srcDir: "/project/src" }],
      errors: [{ messageId: "missingFile" }],
      output: script('const { t } = useI18n("components/AppHeader.vue")'),
    },
    // wrong path — rewrite to correct one
    {
      filename: "/project/src/views/Home.vue",
      code: script("const { t } = useI18n('views/Other.vue')"),
      options: [{ srcDir: "/project/src" }],
      errors: [{ messageId: "wrongFile", data: { actual: "views/Other.vue", expected: "views/Home.vue" } }],
      output: script('const { t } = useI18n("views/Home.vue")'),
    },
    // non-string argument
    {
      filename: "test.vue",
      code: script("const { t } = useI18n(someVar)"),
      errors: [{ messageId: "notStringLiteral" }],
    },
    {
      filename: "test.vue",
      code: script("const { t } = useI18n(42)"),
      errors: [{ messageId: "notStringLiteral" }],
    },
  ],
})
