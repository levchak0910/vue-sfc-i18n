import { parseSync, Visitor } from "oxc-parser"

export function parseTranslations(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  const { program } = parseSync("chunk.js", body)

  const visitor = new Visitor({
    Property(prop) {
      if (prop.computed) return

      let key: string | null = null
      if (prop.key.type === "Identifier") {
        key = prop.key.name
      } else if (prop.key.type === "Literal" && typeof prop.key.value === "string") {
        key = prop.key.value
      }

      if (key === null) return

      let value: string | null = null
      if (prop.value.type === "Literal" && typeof prop.value.value === "string") {
        value = prop.value.value
      } else if (prop.value.type === "TemplateLiteral" && prop.value.expressions.length === 0) {
        const [part] = prop.value.quasis
        value = part.value.cooked ?? part.value.raw
      }

      if (value !== null) result[key] = value
    },
  })

  visitor.visit(program)

  return result
}
