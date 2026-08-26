import { expect, test } from "@playwright/test"
import { collectTranslations, trackLoaded } from "../utils/network"
import { pageSettled } from "../utils/page"


test.describe("Home: rendering", () => {
  test("renders English greeting and farewell when /en entered", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("greeting")).toHaveText("Hello World")
    await expect(page.getByTestId("farewell")).toHaveText("Goodbye")
  })

  test("renders Hungarian greeting and farewell when /hu entered", async ({ page }) => {
    await page.goto("/hu")

    await expect(page.getByTestId("greeting")).toHaveText("Helló Világ")
    await expect(page.getByTestId("farewell")).toHaveText("Viszlát")
  })

  test("switches to Hungarian", async ({ page }) => {
    await page.goto("/en")

    await expect(page.getByTestId("greeting")).toHaveText("Hello World")
    await expect(page.getByTestId("farewell")).toHaveText("Goodbye")
    await expect(page.getByTestId("greeting")).not.toHaveText("Helló Világ")
    await expect(page.getByTestId("farewell")).not.toHaveText("Viszlát")

    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("greeting")).not.toHaveText("Hello World")
    await expect(page.getByTestId("farewell")).not.toHaveText("Goodbye")
    await expect(page.getByTestId("greeting")).toHaveText("Helló Világ")
    await expect(page.getByTestId("farewell")).toHaveText("Viszlát")
  })
})

test.describe("About: rendering", () => {
  test("renders English about-title and team when /en/about entered", async ({ page }) => {
    await page.goto("/en/about")

    await expect(page.getByTestId("about-title")).toHaveText("About Us")
    await expect(page.getByTestId("team")).toHaveText("Our Team")
  })

  test("renders Hungarian about-title and team when /hu/about entered", async ({ page }) => {
    await page.goto("/hu/about")

    await expect(page.getByTestId("about-title")).toHaveText("Rólunk")
    await expect(page.getByTestId("team")).toHaveText("Csapatunk")
  })

  test("switches to Hungarian", async ({ page }) => {
    await page.goto("/en/about")

    await expect(page.getByTestId("about-title")).toHaveText("About Us")
    await expect(page.getByTestId("team")).toHaveText("Our Team")
    await expect(page.getByTestId("about-title")).not.toHaveText("Rólunk")
    await expect(page.getByTestId("team")).not.toHaveText("Csapatunk")

    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("about-title")).not.toHaveText("About Us")
    await expect(page.getByTestId("team")).not.toHaveText("Our Team")
    await expect(page.getByTestId("about-title")).toHaveText("Rólunk")
    await expect(page.getByTestId("team")).toHaveText("Csapatunk")
  })
})

test.describe("Contacts: rendering", () => {
  test("renders English contacts-title and email when /en/contacts entered", async ({ page }) => {
    await page.goto("/en/contacts")

    await expect(page.getByTestId("contacts-title")).toHaveText("Contact Us")
    await expect(page.getByTestId("contacts-email")).toHaveText("Email us at hello@example.com")
  })

  test("renders Hungarian contacts-title and email when /hu/contacts entered", async ({ page }) => {
    await page.goto("/hu/contacts")

    await expect(page.getByTestId("contacts-title")).toHaveText("Kapcsolat")
    await expect(page.getByTestId("contacts-email")).toHaveText("Írjon nekünk a e-mail cimre hello@example.com")
  })

  test("switches to Hungarian", async ({ page }) => {
    await page.goto("/en/contacts")

    await expect(page.getByTestId("contacts-title")).toHaveText("Contact Us")
    await expect(page.getByTestId("contacts-email")).toHaveText("Email us at hello@example.com")
    await expect(page.getByTestId("contacts-title")).not.toHaveText("Kapcsolat")
    await expect(page.getByTestId("contacts-email")).not.toHaveText("Írjon nekünk a e-mail cimre hello@example.com")

    await page.getByTestId("btn-hu").click()

    await expect(page.getByTestId("contacts-title")).not.toHaveText("Contact Us")
    await expect(page.getByTestId("contacts-email")).not.toHaveText("Email us at hello@example.com")
    await expect(page.getByTestId("contacts-title")).toHaveText("Kapcsolat")
    await expect(page.getByTestId("contacts-email")).toHaveText("Írjon nekünk a e-mail cimre hello@example.com")
  })
})

test.describe("chunk isolation @dev-only", () => {
  test("entry/views-home/en chunk contains only English translations of Home page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-home/en")
    await page.goto("/en")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Hello World")
    expect(translations).toHaveProperty("farewell", "Goodbye")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("entry/views-home/hu chunk contains only Hungarian translations of Home page", async ({ page }) => {
    const getTranslations = collectTranslations("dev", page, "views-home/hu")
    await page.goto("/hu")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Helló Világ")
    expect(translations).toHaveProperty("farewell", "Viszlát")
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
  test("views-home module is loaded on initial page visit, not About or Contacts", async ({ page }) => {
    const getLoaded = trackLoaded("dev", page)

    await page.goto("/en")
    await pageSettled(page)

    expect(getLoaded().hasView("home")).toBe(true)
    expect(getLoaded().hasView("about")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("views-about module is loaded lazily only when navigating to /about", async ({ page }) => {
    const getLoaded = trackLoaded("dev", page)

    await page.goto("/en")
    await pageSettled(page)

    expect(getLoaded().hasView("about")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)

    await page.getByTestId("nav-about").click()
    await pageSettled(page)

    expect(getLoaded().hasView("about")).toBe(true)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("Hungarian module is fetched lazily only after switching language", async ({ page }) => {
    const getLoaded = trackLoaded("dev", page)

    await page.goto("/en")
    expect(getLoaded().hasLang("hu")).toBe(false)

    await page.getByTestId("btn-hu").click()
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
})

test.describe("lazy loading @prod-only", () => {
  test("About and Contacts chunks not loaded on initial /en visit", async ({ page }) => {
    const getLoaded = trackLoaded("prod", page)
    await page.goto("/en")

    expect(getLoaded().hasView("about")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("About chunk loaded lazily when navigating to /en/about", async ({ page }) => {
    const getLoaded = trackLoaded("prod", page)
    await page.goto("/en")

    expect(getLoaded().hasView("about")).toBe(false)
    expect(getLoaded().hasView("contacts")).toBe(false)

    await page.getByTestId("nav-about").click()

    expect(getLoaded().hasView("about")).toBe(true)
    expect(getLoaded().hasView("contacts")).toBe(false)
  })

  test("Hungarian module is fetched lazily only after switching language", async ({ page }) => {
    const getLoaded = trackLoaded("prod", page)
    await page.goto("/en")

    expect(getLoaded().hasLang("hu")).toBe(false)

    await page.getByTestId("btn-hu").click()

    expect(getLoaded().hasLang("hu")).toBe(true)
  })
})

test.describe("chunk isolation @prod-only", () => {
  test("/en page loads only Home translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/en")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Hello World")
    expect(translations).toHaveProperty("farewell", "Goodbye")
    expect(translations).not.toHaveProperty("about-title")
    expect(translations).not.toHaveProperty("team")
    expect(translations).not.toHaveProperty("contacts-title")
    expect(translations).not.toHaveProperty("contacts-email")
  })

  test("/hu page loads only Home translations", async ({ page }) => {
    const getTranslations = collectTranslations("prod", page)
    await page.goto("/hu")
    const translations = await getTranslations()

    expect(translations).toHaveProperty("greeting", "Helló Világ")
    expect(translations).toHaveProperty("farewell", "Viszlát")
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
