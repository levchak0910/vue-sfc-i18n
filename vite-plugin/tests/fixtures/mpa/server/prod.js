import { createServer } from "node:http"
import { createReadStream, existsSync, readFileSync } from "node:fs"
import { extname } from "node:path"
import { MIME, root } from "./shared.js"

export async function setup() {
  const template = readFileSync(`${root}/dist/client/index.html`, "utf-8")
  const { render } = await import("../dist/server/entry-server.js")

  return createServer(async (req, res) => {
    try {
      const url = req.url ?? "/"
      const filePath = `${root}/dist/client${url}`

      if (existsSync(filePath) && !url.endsWith("/")) {
        res.setHeader("Content-Type", MIME[extname(url)] ?? "application/octet-stream")
        createReadStream(filePath).pipe(res)
        return
      }

      const appHtml = await render(url)
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(template.replace("<!--app-html-->", appHtml))
    } catch (e) {
      res.writeHead(500)
      res.end(e.message)
    }
  })
}
