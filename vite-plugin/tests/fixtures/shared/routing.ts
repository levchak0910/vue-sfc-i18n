export const LANGS = ["en", "hu"]

export type View = "home" | "about" | "contacts"

export function parsePath(path: string): { lang: string; view: View } {
  const parts = path.split("/").filter(Boolean)
  let lang = "en"
  let rest = parts
  if (parts.length > 0 && LANGS.includes(parts[0])) {
    lang = parts[0]
    rest = parts.slice(1)
  }
  const seg = rest[0] ?? ""
  let view: View = "home"
  if (seg === "about") view = "about"
  else if (seg === "contacts") view = "contacts"
  return { lang, view }
}

export function toPath(view: View, lang: string): string {
  return view === "home" ? `/${lang}` : `/${lang}/${view}`
}
