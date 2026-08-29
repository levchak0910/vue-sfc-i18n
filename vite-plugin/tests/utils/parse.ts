export function parseDevTranslations(body: string): Record<string, string> {
  const match = body.match(/export default ({.*})/)
  return match ? JSON.parse(match[1]) : {}
}

export function parseProdTranslations(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  const re = /(?:"([^"]+)"|(\w+)):`([^`]*)`/g
  let m
  while ((m = re.exec(body)) !== null) result[m[1] ?? m[2]] = m[3]
  return result
}
