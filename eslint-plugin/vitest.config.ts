import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/rules/**/*.ts"],
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
  },
})
