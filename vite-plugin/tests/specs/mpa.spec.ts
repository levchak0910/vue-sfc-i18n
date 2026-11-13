import * as fs from "node:fs"
import * as url from "node:url"

import { expect, test } from "@playwright/test"

import { collectTranslations, trackLoaded } from "../utils/network"
import { pageSettled } from "../utils/page"

test.describe("server-side routing", () => {
  test("/en renders Home content in the initial HTML", async ({ page }) => {
    const response = await page.request.get("/en")
    const html = await response.text()
    expect(html).toContain("Hello, World!")
    expect(html).toContain("Goodbye")
    expect(html).not.toContain("About Us")
    expect(html).not.toContain("Our Team")
    expect(html).not.toContain("Contact Us")
    expect(html).not.toContain("Email us at hello@example.com")
  })

  test("/hu renders Hungarian Home content in the initial HTML", async ({ page }) => {
    const response = await page.request.get("/hu")
    const html = await response.text()
    expect(html).toContain("Szia, World!")
    expect(html).toContain("Viszlát")
    expect(html).not.toContain("Rólunk")
    expect(html).not.toContain("Csapatunk")
    expect(html).not.toContain("Kapcsolat")
    expect(html).not.toContain("Írjon nekünk")
  })

  test("/en/about renders About content in the initial HTML", async ({ page }) => {
    const response = await page.request.get("/en/about")
    const html = await response.text()
    expect(html).toContain("About Us")
    expect(html).toContain("Our Team")
    expect(html).not.toContain("Hello, World!")
    expect(html).not.toContain("Goodbye")
    expect(html).not.toContain("Contact Us")
    expect(html).not.toContain("Email us at hello@example.com")
  })

  test("/hu/about renders Hungarian About content in the initial HTML", async ({ page }) => {
    const response = await page.request.get("/hu/about")
    const html = await response.text()
    expect(html).toContain("Rólunk")
    expect(html).toContain("Csapatunk")
    expect(html).not.toContain("Szia, World!")
    expect(html).not.toContain("Viszlát")
    expect(html).not.toContain("Kapcsolat")
    expect(html).not.toContain("Írjon nekünk")
  })

  test("/en/contacts renders Contacts content in the initial HTML", async ({ page }) => {
    const response = await page.request.get("/en/contacts")
    const html = await response.text()
    expect(html).toContain("Contact Us")
    expect(html).toContain("Email us at hello@example.com")
    expect(html).not.toContain("Hello, World!")
    expect(html).not.toContain("Goodbye")
    expect(html).not.toContain("About Us")
    expect(html).not.toContain("Our Team")
  })

  test("/hu/contacts renders Hungarian Contacts content in the initial HTML", async ({ page }) => {
    const response = await page.request.get("/hu/contacts")
    const html = await response.text()
    expect(html).toContain("Kapcsolat")
    expect(html).toContain("Írjon nekünk a e-mail cimre hello@example.com")
    expect(html).not.toContain("Szia, World!")
    expect(html).not.toContain("Viszlát")
    expect(html).not.toContain("Rólunk")
    expect(html).not.toContain("Csapatunk")
  })
})

test.describe("server-side rendering: concurrency", () => {
  test("concurrent requests in different languages render each in its own language", async ({ page }) => {
    const paths = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? "/en" : "/hu"))
    const pageContents = await Promise.all(
      paths.map(async path => {
        const response = await page.request.get(path)
        const content = await response.text()
        return { path, content }
      }),
    )
    const en = "Hello, World!"
    const hu = "Szia, World!"

    expect(
      pageContents.filter(p => p.path === "/en").every(p => p.content.includes(en) && !p.content.includes(hu)),
    ).toEqual(true)
    expect(
      pageContents.filter(p => p.path === "/hu").every(p => p.content.includes(hu) && !p.content.includes(en)),
    ).toEqual(true)
  })

  test("concurrent requests to different views keep each view and language", async ({ page }) => {
    const texts: Record<string, string> = {
      "/en/about": "About Us",
      "/hu/about": "Rólunk",
      "/en/contacts": "Contact Us",
      "/hu/contacts": "Kapcsolat",
    }
    const views = Object.keys(texts)
    const paths = Array.from({ length: 40 }, (_, i) => views[i % views.length])
    const pageContents = await Promise.all(
      paths.map(async path => {
        const response = await page.request.get(path)
        const content = await response.text()
        return { path, content }
      }),
    )

    for (const view of views) {
      const others = views.filter(v => v !== view).map(v => texts[v])

      expect(
        pageContents
          .filter(p => p.path === view)
          .every(p => p.content.includes(texts[view]) && others.every(text => !p.content.includes(text))),
      ).toEqual(true)
    }
  })
})

test.describe("Home: rendering", () => {
  test("renders English translations after hydration", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("greeting")).toHaveText("Hello, World!")
    await expect(page.getByTestId("farewell")).toHaveText("Goodbye")
  })

  test("renders Hungarian when navigating directly to /hu", async ({ page }) => {
    await page.goto("/hu")

    await expect(page.getByTestId("greeting")).toHaveText("Szia, World!")
    await expect(page.getByTestId("farewell")).toHaveText("Viszlát")
  })

  test("switches to Hungarian by following /hu link", async ({ page }) => {
    await page.goto("/en")
    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("greeting")).toHaveText("Szia, World!")
    await expect(page.getByTestId("farewell")).toHaveText("Viszlát")
  })
})

test.describe("Home: interpolation", () => {
  test("substitutes {name} param in English greeting", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("greeting")).toHaveText("Hello, World!")
    await expect(page.getByTestId("greeting")).not.toHaveText("{name}")
  })

  test("substitutes {name} param in Hungarian greeting", async ({ page }) => {
    await page.goto("/hu")

    await expect(page.getByTestId("greeting")).toHaveText("Szia, World!")
    await expect(page.getByTestId("greeting")).not.toHaveText("{name}")
  })

  test("substituted param is present in SSR HTML", async ({ page }) => {
    const response = await page.request.get("/en")
    const html = await response.text()

    expect(html).toContain("Hello, World!")
    expect(html).not.toContain("{name}")
  })
})

test.describe("Home: pluralization", () => {
  test("renders English singular form for count 1", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("items-singular")).toHaveText("one item")
  })

  test("renders English plural form with interpolated count for count 5", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("items-plural")).toHaveText("5 items")
  })

  test("renders Hungarian singular form for count 1", async ({ page }) => {
    await page.goto("/hu")

    await expect(page.getByTestId("items-singular")).toHaveText("egy elem")
  })

  test("renders Hungarian plural form with interpolated count for count 5", async ({ page }) => {
    await page.goto("/hu")

    await expect(page.getByTestId("items-plural")).toHaveText("5 elem")
  })

  test("plural forms are present in SSR HTML", async ({ page }) => {
    const response = await page.request.get("/en")
    const html = await response.text()

    expect(html).toContain("one item")
    expect(html).toContain("5 items")
  })

  test("plural form updates after language switch", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("items-singular")).toHaveText("one item")
    await expect(page.getByTestId("items-plural")).toHaveText("5 items")

    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("items-singular")).toHaveText("egy elem")
    await expect(page.getByTestId("items-plural")).toHaveText("5 elem")
  })

  test("selects English singular variant without {n} interpolation", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("items-plain-singular")).toHaveText("item")
  })

  test("selects English plural variant without {n} interpolation", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("items-plain-plural")).toHaveText("items")
  })

  test("selects Hungarian singular and plural plain variants", async ({ page }) => {
    await page.goto("/hu")

    await expect(page.getByTestId("items-plain-singular")).toHaveText("elem")
    await expect(page.getByTestId("items-plain-plural")).toHaveText("elemek")
  })
})

test.describe("About: rendering", () => {
  test("renders English translations after navigating to /en/about", async ({ page }) => {
    await page.goto("/en/about")

    await expect(page.getByTestId("about-title")).toHaveText("About Us")
    await expect(page.getByTestId("team")).toHaveText("Our Team")
  })

  test("renders Hungarian when navigating directly to /hu/about", async ({ page }) => {
    await page.goto("/hu/about")

    await expect(page.getByTestId("about-title")).toHaveText("Rólunk")
    await expect(page.getByTestId("team")).toHaveText("Csapatunk")
  })

  test("switches to Hungarian by following /hu/about link", async ({ page }) => {
    await page.goto("/en/about")
    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("about-title")).toHaveText("Rólunk")
    await expect(page.getByTestId("team")).toHaveText("Csapatunk")
  })
})

test.describe("Contacts: rendering", () => {
  test("renders English translations after navigating to /en/contacts", async ({ page }) => {
    await page.goto("/en/contacts")

    await expect(page.getByTestId("contacts-title")).toHaveText("Contact Us")
    await expect(page.getByTestId("contacts-email")).toHaveText("Email us at hello@example.com")
  })

  test("renders Hungarian when navigating directly to /hu/contacts", async ({ page }) => {
    await page.goto("/hu/contacts")

    await expect(page.getByTestId("contacts-title")).toHaveText("Kapcsolat")
    await expect(page.getByTestId("contacts-email")).toHaveText("Írjon nekünk a e-mail cimre hello@example.com")
  })

  test("switches to Hungarian by following /hu/contacts link", async ({ page }) => {
    await page.goto("/en/contacts")
    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("contacts-title")).toHaveText("Kapcsolat")
    await expect(page.getByTestId("contacts-email")).toHaveText("Írjon nekünk a e-mail cimre hello@example.com")
  })
})

test.describe("chunk isolation @dev-only", () => {
  test("entry/views-home/en chunk contains only English translations of Home page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-home/en")
    await page.goto("/en")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Hello, {name}!")
    expect(translations).toHaveProperty("farewell", "Goodbye")
    expect(translations).toHaveProperty("N items", "one item | {n} items")
    expect(translations).toHaveProperty("items", "item | items")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("entry/views-home/hu chunk contains only Hungarian translations of Home page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-home/hu")
    await page.goto("/hu")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Szia, {name}!")
    expect(translations).toHaveProperty("farewell", "Viszlát")
    expect(translations).toHaveProperty("N items", "egy elem | {n} elem")
    expect(translations).toHaveProperty("items", "elem | elemek")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("entry/views-about/en chunk contains only English translations of About page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-about/en")
    await page.goto("/en/about")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("about-title", "About Us")
    expect(translations).toHaveProperty("team", "Our Team")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("entry/views-about/hu chunk contains only Hungarian translations of About page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-about/hu")
    await page.goto("/hu/about")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("about-title", "Rólunk")
    expect(translations).toHaveProperty("team", "Csapatunk")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("entry/views-contacts/en chunk contains only English translations of Contacts page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-contacts/en")
    await page.goto("/en/contacts")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("contacts-title", "Contact Us")
    expect(translations).toHaveProperty("contacts-email", "Email us at hello@example.com")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
  })

  test("entry/views-contacts/hu chunk contains only Hungarian translations of Contacts page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-contacts/hu")
    await page.goto("/hu/contacts")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("contacts-title", "Kapcsolat")
    expect(translations).toHaveProperty("contacts-email", "Írjon nekünk a e-mail cimre hello@example.com")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
  })
})

test.describe("lazy loading @dev-only", () => {
  test("only views-home module is loaded on /en, not About or Contacts", async ({ page }) => {
    const getLoaded = trackLoaded("dev", page)

    await page.goto("/en")
    await pageSettled(page)

    expect(getLoaded().hasView("home")).toBe(true)
    expect(getLoaded().hasView("about")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("only views-about module is loaded on /en/about, not Home or Contacts", async ({ page }) => {
    const getLoaded = trackLoaded("dev", page)

    await page.goto("/en/about")
    await pageSettled(page)

    expect(getLoaded().hasView("about")).toBe(true)
    expect(getLoaded().hasView("home")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("Hungarian module is fetched only when navigating to /hu, not on /en", async ({ page }) => {
    const getLoaded = trackLoaded("dev", page)

    await page.goto("/en")
    await pageSettled(page)

    expect(getLoaded().hasLang("hu")).toBe(false)

    await page.getByTestId("btn-hu").click()
    await pageSettled(page)

    expect(getLoaded().hasLang("hu")).toBe(true)
  })
})

test.describe("loader chunk @dev-only", () => {
  test("each entry has its own loader chunk referencing only its own languages", async ({ page }) => {
    await page.goto("/en")
    const resp = await page.request.get("/@id/__x00__virtual:i18n/entry/views-home")
    const body = await resp.text()

    expect(body).toContain("registerEntryLoader")
    expect(body).toContain("entry/views-home/en")
    expect(body).toContain("entry/views-home/hu")
    expect(body).not.toContain("views-about")
    expect(body).not.toContain("views-contacts")
  })

  test("loader receives the language instead of reading the global one", async ({ page }) => {
    await page.goto("/en")
    const resp = await page.request.get("/@id/__x00__virtual:i18n/entry/views-home")
    const body = await resp.text()

    expect(body).toContain("async function _load(language)")
    expect(body).toContain("_loaders[language]")
    expect(body).toContain("await manager.registerEntryLoader(_load)")
    expect(body).not.toContain("manager.getLanguage()")
  })

  test("HMR update merges translations of every language", async ({ page }) => {
    await page.goto("/en")
    const resp = await page.request.get("/@id/__x00__virtual:i18n/entry/views-home")
    const body = await resp.text()

    expect(body).toContain(
      "for (const [language, data] of Object.entries(dict)) manager.mergeTranslations(data, language)",
    )
  })
})

test.describe("lazy loading @prod-only", () => {
  test("About and Contacts chunks not loaded on /en", async ({ page }) => {
    const getLoaded = trackLoaded("prod", page)
    await page.goto("/en")

    expect(getLoaded().hasView("home")).toBe(true)
    expect(getLoaded().hasView("about")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("only About chunk loaded on /en/about, not Home or Contacts", async ({ page }) => {
    const getLoaded = trackLoaded("prod", page)
    await page.goto("/en/about")

    expect(getLoaded().hasView("about")).toBe(true)
    expect(getLoaded().hasView("home")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("Hungarian module is fetched only when navigating to /hu, not on /en", async ({ page }) => {
    const getLoaded = trackLoaded("prod", page)

    await page.goto("/en")

    expect(getLoaded().hasLang("hu")).toBe(false)

    await page.getByTestId("btn-hu").click()
    await pageSettled(page)

    expect(getLoaded().hasLang("hu")).toBe(true)
  })
})

test.describe("chunk isolation @prod-only", () => {
  test("/en page loads only Home translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/en")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Hello, {name}!")
    expect(translations).toHaveProperty("farewell", "Goodbye")
    expect(translations).toHaveProperty("N items", "one item | {n} items")
    expect(translations).toHaveProperty("items", "item | items")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("/hu page loads only Home translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/hu")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Szia, {name}!")
    expect(translations).toHaveProperty("farewell", "Viszlát")
    expect(translations).toHaveProperty("N items", "egy elem | {n} elem")
    expect(translations).toHaveProperty("items", "elem | elemek")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("/en/about page loads only About translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/en/about")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("about-title", "About Us")
    expect(translations).toHaveProperty("team", "Our Team")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("/hu/about page loads only About translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/hu/about")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("about-title", "Rólunk")
    expect(translations).toHaveProperty("team", "Csapatunk")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("/en/contacts page loads only Contacts translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/en/contacts")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("contacts-title", "Contact Us")
    expect(translations).toHaveProperty("contacts-email", "Email us at hello@example.com")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
  })

  test("/hu/contacts page loads only Contacts translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/hu/contacts")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("contacts-title", "Kapcsolat")
    expect(translations).toHaveProperty("contacts-email", "Írjon nekünk a e-mail cimre hello@example.com")
    expect(translations).not.toHaveProperty("greeting")
    expect(translations).not.toHaveProperty("farewell")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
  })
})

test.describe("HMR: translation updates", () => {
  const fixturePath = url.fileURLToPath(new URL("../fixtures/mpa/src/views/Home.vue", import.meta.url))
  let originalContent: string

  test.beforeEach(async () => {
    originalContent = fs.readFileSync(fixturePath, "utf-8")
  })

  test.afterEach(async () => {
    fs.writeFileSync(fixturePath, originalContent)
  })

  test("applies changed translation and new key via HMR without page reload @dev-only", async ({ page }) => {
    await page.goto("/en")
    await expect(page.getByTestId("farewell")).toHaveText("Goodbye")
    await expect(page.getByTestId("motto")).toHaveCount(0)

    // Detect full page reload: this value won't survive one
    await page.evaluate(() => {
      ;(window as unknown as Record<string, unknown>).__hmrMarker = true
    })

    const modified = originalContent
      .replace(
        '<p data-testid="farewell">{{ t("farewell") }}</p>',
        '<p data-testid="farewell">{{ t("farewell") }}</p>\n    <p data-testid="motto">{{ t("motto") }}</p>',
      )
      .replace("farewell: Goodbye", "farewell: See you later!")
      .replace("items: item | items", "items: item | items\nmotto: Created with Vue")

    fs.writeFileSync(fixturePath, modified)

    await expect(page.getByTestId("farewell")).toHaveText("See you later!", { timeout: 10_000 })
    await expect(page.getByTestId("motto")).toHaveText("Created with Vue", { timeout: 10_000 })
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__hmrMarker)).toBe(true)
  })

  test("import.meta.hot is dead-code eliminated from all JS chunks @prod-only", async ({ page }) => {
    const pending: Promise<string>[] = []
    page.on("response", r => {
      if (r.url().match(/\.js(\?|$)/)) pending.push(r.text())
    })

    await page.goto("/en")
    await pageSettled(page)

    const bodies = await Promise.all(pending)
    for (const body of bodies) {
      expect(body).not.toContain("import.meta.hot")
      expect(body).not.toContain("i18n:update")
    }
  })
})
