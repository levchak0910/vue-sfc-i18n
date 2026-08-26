import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as os from "node:os"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { generateKeys } from "./index"

describe("generateKeys", () => {
  let tmpDir: string
  let keysFile: string

  beforeEach(async () => {
    tmpDir = path.join(os.tmpdir(), `vue-sfc-i18n-generate-test-${Date.now()}`)
    await fs.mkdir(tmpDir, { recursive: true })
    keysFile = path.join(tmpDir, "i18n-keys.d.ts")
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  async function writeVue(relPath: string, content: string): Promise<void> {
    const full = path.join(tmpDir, relPath)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content)
  }

  const sfc = (blocks: string[]): string => `<template><div/></template>\n${blocks.join("\n")}`

  const i18nBlock = (locale: string, content: string[]): string => (
    `<i18n locale="${locale}">\n${content.join("\n")}\n</i18n>`
  )

  it("writes an empty schema for a directory with no .vue files", async () => {
    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('declare module "@vue-sfc-i18n/composable" {')
    expect(content).toContain("  interface I18nSchema {")
    expect(content).toContain("export {}")
    expect(content).not.toMatch(/"[^"]+": string/)
  })

  it("collects keys from a single component", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello", "farewell: Goodbye"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"greeting": string')
    expect(content).toContain('"farewell": string')
  })

  it("collects keys from multiple components", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))
    await writeVue("About.vue", sfc([i18nBlock("en", ["about-title: About Us"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"greeting": string')
    expect(content).toContain('"about-title": string')
  })

  it("collects keys from all locales of a component", async () => {
    await writeVue("Home.vue", sfc([
      i18nBlock("en", ["greeting: Hello"]),
      i18nBlock("hu", ["farewell: Viszlát"]),
    ]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"greeting": string')
    expect(content).toContain('"farewell": string')
  })

  it("deduplicates keys appearing across multiple components and locales", async () => {
    await writeVue("Home.vue", sfc([
      i18nBlock("en", ["greeting: Hello"]),
      i18nBlock("hu", ["greeting: Helló"]),
    ]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    const count = (content.match(/"greeting": string/g) ?? []).length
    expect(count).toBe(1)
  })

  it("skips non-string values", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["ok: yes", "nested:", "  a: 1"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"ok": string')
    expect(content).not.toContain('"nested": string')
  })

  it("collects keys from .vue files in subdirectories", async () => {
    await writeVue("views/Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"greeting": string')
  })

  it("produces exact module augmentation output", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toBe(
      'declare module "@vue-sfc-i18n/composable" {\n'
      + "  interface I18nSchema {\n"
      + '    "greeting": string\n'
      + "  }\n"
      + "}\n"
      + "\n"
      + "export {}\n",
    )
  })

  it("emits a param object type for a key with one placeholder", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello, {name}!"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"greeting": { name: string | number }')
  })

  it("emits param object types for a key with multiple placeholders", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["msg: \"'{a}' and '{b}'\""])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"msg": { a: string | number; b: string | number }')
  })

  it("unions params from the same key across locales", async () => {
    await writeVue("Home.vue", sfc([
      i18nBlock("en", ["msg: Hello, {name}!"]),
      i18nBlock("hu", ["msg: Helló, {name}!"]),
    ]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")
    const count = content.match(/"msg":/g) ?? []

    expect(content).toContain('"msg": { name: string | number }')
    expect(count).toHaveLength(1)
  })

  it("collects params from the same key across files", async () => {
    await writeVue("A.vue", sfc([i18nBlock("en", ["msg: Hi, {name}!"])]))
    await writeVue("B.vue", sfc([i18nBlock("en", ["msg: Hey, {name}!"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")
    const count = content.match(/"msg":/g) ?? []

    expect(content).toContain('"msg": { name: string | number }')
    expect(count).toHaveLength(1)
  })

  it("produces exact output for a key with placeholders", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello, {name}!"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toBe(
      'declare module "@vue-sfc-i18n/composable" {\n'
      + "  interface I18nSchema {\n"
      + '    "greeting": { name: string | number }\n'
      + "  }\n"
      + "}\n"
      + "\n"
      + "export {}\n",
    )
  })
})
