import type { Page } from "@playwright/test"

export async function pageSettled(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle")
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)))
  await page.evaluate(() => new Promise<void>(resolve => requestIdleCallback(() => resolve())))
}
