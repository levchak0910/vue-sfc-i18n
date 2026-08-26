import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { createServer as createViteServer } from "vite"
import { root } from "./shared.js"

export async function setup() {
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: "custom" })

  const { manager } = await vite.ssrLoadModule("@vue-sfc-i18n/composable")
  await manager.loadTranslations("en")

  vite.middlewares.use(async (req, res, next) => {
    try {
      const rawTemplate = readFileSync(`${root}/index.html`, "utf-8")
      const template = await vite.transformIndexHtml(req.url ?? "/", rawTemplate)
      const { render } = await vite.ssrLoadModule("/src/entry-server.ts")
      const appHtml = await render(req.url ?? "/")
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(template.replace("<!--app-html-->", appHtml))
    } catch (e) {
      vite.ssrFixStacktrace(e)
      next(e)
    }
  })

  return createServer(vite.middlewares)
}
