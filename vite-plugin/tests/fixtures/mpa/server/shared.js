import { fileURLToPath } from "node:url"

export const PORT = Number(process.env.PORT)
export const root = fileURLToPath(new URL("..", import.meta.url))

export const MIME = {
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
}
