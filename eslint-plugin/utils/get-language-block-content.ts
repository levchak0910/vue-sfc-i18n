type Loc = { column: number; line: number }

function offsetToLoc(src: string, offset: number): Loc {
  const before = src.slice(0, offset)
  return {
    line: before.split("\n").length,
    column: offset - before.lastIndexOf("\n") - 1,
  }
}

type Param = { name: string; loc: { end: Loc; start: Loc } }

function parseParams(src: string, value: string, valueAbsStart: number): Param[] {
  return [...value.matchAll(/\{([^}]+)\}/g)].map(m => ({
    name: m[1].trim(),
    loc: {
      start: offsetToLoc(src, valueAbsStart + (m.index ?? 0)),
      end: offsetToLoc(src, valueAbsStart + (m.index ?? 0) + m[0].length),
    },
  }))
}

type KeyValueEntry = {
  key: string
  value: string
  valueParams: Param[]
  keyLoc: { end: Loc; start: Loc }
  valueLoc: { end: Loc; start: Loc }
  locAt: (valueOffset: number) => Loc
  absAt: (valueOffset: number) => number
}

export function forEachKeyValue(
  src: string,
  contentRange: [number, number],
  callback: (entry: KeyValueEntry) => void,
): void {
  const [blockStart, blockEnd] = contentRange
  const content = src.slice(blockStart, blockEnd)

  let lineOffset = 0
  for (const line of content.split("\n")) {
    const sepIdx = line.indexOf(": ")
    if (sepIdx !== -1) {
      const key = line.slice(0, sepIdx).trim()
      const value = line.slice(sepIdx + 2)
      const keyAbsStart = blockStart + lineOffset + line.indexOf(key)
      const valueAbsStart = blockStart + lineOffset + sepIdx + 2
      callback({
        key,
        value,
        valueParams: parseParams(src, value, valueAbsStart),
        keyLoc: {
          start: offsetToLoc(src, keyAbsStart),
          end: offsetToLoc(src, keyAbsStart + key.length),
        },
        valueLoc: {
          start: offsetToLoc(src, valueAbsStart),
          end: offsetToLoc(src, valueAbsStart + value.length),
        },
        locAt: offset => offsetToLoc(src, valueAbsStart + offset),
        absAt: offset => valueAbsStart + offset,
      })
    }
    lineOffset += line.length + 1
  }
}
