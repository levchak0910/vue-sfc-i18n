import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { i18nPlugin } from "../../../index"

export default defineConfig({
  plugins: [
    vue(),
    i18nPlugin({
      entries: ["views/*.vue"],
      keysFile: "i18n-keys.d.ts",
    }),
  ],
})
