import type { Rule } from "eslint"

import { getDocumentFragment } from "./parser-services.js"

type CommentESLint = ReturnType<Rule.RuleContext["sourceCode"]["getAllComments"]>[number]
type CommentVue = NonNullable<ReturnType<typeof getDocumentFragment>>["comments"][number]
type Comment = CommentESLint | CommentVue
export type PluginComment = { name: string; value: string }

const PLUGIN_RE = /@vue-sfc-i18n\s+([^:]+):\s*(.+)/

function parsePluginComment(raw: Comment): PluginComment | null {
  const match = raw.value.match(PLUGIN_RE)
  if (!match) return null
  return { name: match[1].trim(), value: match[2].trim() }
}

export function getPluginComments(context: Rule.RuleContext): PluginComment[] {
  const jsComments = context.sourceCode.getAllComments()
  const vueComments = getDocumentFragment(context)?.comments ?? []
  return [...jsComments, ...vueComments].flatMap(c => {
    const parsed = parsePluginComment(c)
    return parsed ? [parsed] : []
  })
}
