import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { extractTranslations, walkVueFiles } from "./index"

describe("extractTranslations", () => {
  const sfc = (blocks: string[]): string => `<template><div/></template>\n${blocks.join("\n")}`

  const i18nBlock = (locale: string, content: string[]): string => (
    `<i18n locale="${locale}">\n${content.join("\n")}\n</i18n>`
  )

  it("returns empty object for a component without i18n blocks", () => {
    expect(extractTranslations(sfc([]))).toEqual({})
  })

  it("extracts translations from a single i18n block", () => {
    const code = sfc([i18nBlock("en", ["greeting: Hello", "farewell: Goodbye"])])

    expect(extractTranslations(code)).toEqual({
      en: { greeting: "Hello", farewell: "Goodbye" },
    })
  })

  it("extracts translations from multiple blocks with different locales", () => {
    const code = sfc([
      i18nBlock("en", ["greeting: Hello"]),
      i18nBlock("hu", ["greeting: Helló"]),
    ])

    expect(extractTranslations(code)).toEqual({
      en: { greeting: "Hello" },
      hu: { greeting: "Helló" },
    })
  })

  it("skips entries whose value is not a string", () => {
    const code = sfc([i18nBlock("en", ["ok: yes", "nested:", "  a: 1", "list:", "  - x"])])

    expect(extractTranslations(code)).toEqual({ en: { ok: "yes" } })
  })

  it("skips an i18n block whose YAML parses to null", () => {
    const code = sfc([i18nBlock("en", ["~"])])

    expect(extractTranslations(code)).toEqual({})
  })

  it("skips an i18n block whose YAML parses to a non-object scalar", () => {
    const code = sfc([i18nBlock("en", ["just a string"])])

    expect(extractTranslations(code)).toEqual({})
  })
})

describe("walkVueFiles", () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `vue-sfc-i18n-test-${Date.now()}`)
    await fs.mkdir(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  async function touch(relPath: string): Promise<string> {
    const full = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, "")
    return full
  }

  it("returns empty array for an empty directory", async () => {
    expect(await walkVueFiles(tmpDir)).toEqual([])
  })

  it("returns .vue files in a flat directory", async () => {
    const a = await touch("A.vue")
    const b = await touch("B.vue")
    const result = await walkVueFiles(tmpDir)

    expect(result.sort()).toEqual([a, b].sort())
  })

  it("ignores non-.vue files", async () => {
    await touch("main.ts")
    await touch("style.css")

    expect(await walkVueFiles(tmpDir)).toEqual([])
  })

  it("returns .vue files from subdirectories", async () => {
    const a = await touch("a/b/c/Deep.vue")
    const b = await touch("Root.vue")
    const result = await walkVueFiles(tmpDir)

    expect(result.sort()).toEqual([a, b].sort())
  })

  it("does not return files from node_modules", async () => {
    await touch("node_modules/some-lib/Comp.vue")

    expect(await walkVueFiles(tmpDir)).toEqual([])
  })
})
