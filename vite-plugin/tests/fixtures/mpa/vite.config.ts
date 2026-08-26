import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { i18nPlugin } from "../../../index"

const srcDir = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    i18nPlugin({
      entries: ["views/*.vue"],
      keysFile: "i18n-keys.d.ts",
      srcDir,
    }),
  ],
})
