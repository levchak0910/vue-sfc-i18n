import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vite"

import { i18nPlugin } from "../../../index.ts"

export default defineConfig({
  plugins: [
    vue(),
    i18nPlugin({
      entries: ["views/*.vue"],
      keysFile: "i18n-keys.d.ts",
    }),
  ],
})
