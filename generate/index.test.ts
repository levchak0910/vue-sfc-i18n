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

  it("includes files with no translations as empty objects", async () => {
    await writeVue("Empty.vue", "<template><div/></template>")

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toMatch(/"Empty\.vue":\s*\{\s*\}/)
  })

  it("uses the file path as the first-level key", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"Home.vue": {')
  })

  it("uses relative paths for nested files", async () => {
    await writeVue("views/Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"views/Home.vue": {')
  })

  it("collects translation keys inside the file entry", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello", "farewell: Goodbye"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"Home.vue": {')
    expect(content).toContain('"greeting": string')
    expect(content).toContain('"farewell": string')
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

  it("keeps keys from different files under separate file entries", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))
    await writeVue("About.vue", sfc([i18nBlock("en", ["about-title: About Us"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    const homeBlock = content.match(/"Home\.vue":\s*\{([^}]*)\}/)?.[1] ?? ""
    const aboutBlock = content.match(/"About\.vue":\s*\{([^}]*)\}/)?.[1] ?? ""

    expect(homeBlock).toContain('"greeting"')
    expect(homeBlock).not.toContain('"about-title"')
    expect(aboutBlock).toContain('"about-title"')
    expect(aboutBlock).not.toContain('"greeting"')
  })

  it("skips non-string values", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["ok: yes", "nested:", "  a: 1"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"ok": string')
    expect(content).not.toContain('"nested": string')
  })

  it("deduplicates keys across locales within the same file", async () => {
    await writeVue("Home.vue", sfc([
      i18nBlock("en", ["greeting: Hello"]),
      i18nBlock("hu", ["greeting: Szia"]),
    ]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    const count = (content.match(/"greeting": string/g) ?? []).length
    expect(count).toBe(1)
  })

  it("emits number type for a plural key", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["items: one item | many items"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"items": number')
  })

  it("emits number type even when {n} appears in a plural variant", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["items: one item | {n} items"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"items": number')
    expect(content).not.toContain('"n"')
  })

  it("treats a key as plural if any locale value contains a pipe", async () => {
    await writeVue("Home.vue", sfc([
      i18nBlock("en", ["items: one item | many items"]),
      i18nBlock("uk", ["items: предмет | предмети | предметів"]),
    ]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toContain('"items": number')
  })

  it("produces exact module augmentation output", async () => {
    await writeVue("Home.vue", sfc([i18nBlock("en", ["greeting: Hello"])]))

    await generateKeys(tmpDir, keysFile)
    const content = await fs.readFile(keysFile, "utf-8")

    expect(content).toBe(
      'declare module "@vue-sfc-i18n/composable" {\n'
      + "  interface I18nSchema {\n"
      + '    "Home.vue": {\n'
      + '      "greeting": string\n'
      + "    }\n"
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
      i18nBlock("hu", ["msg: Szia, {name}!"]),
    ]))

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
      + '    "Home.vue": {\n'
      + '      "greeting": { name: string | number }\n'
      + "    }\n"
      + "  }\n"
      + "}\n"
      + "\n"
      + "export {}\n",
    )
  })
})
