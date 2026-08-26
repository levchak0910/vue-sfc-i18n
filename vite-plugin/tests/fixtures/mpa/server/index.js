import { PORT } from "./shared.js"

const isProd = process.env.NODE_ENV === "production"
const { setup } = await import(isProd ? "./prod.js" : "./dev.js")
const server = await setup()
server.listen(PORT, () => console.log(`MPA server running at http://localhost:${PORT}`))
