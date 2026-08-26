import { defineConfig } from "@playwright/test"

const ports = {
  spaDev: 5170,
  spaProd: 5171,
  mpaDev: 5180,
  mpaProd: 5181,
}

export default defineConfig({
  testDir: "./tests/specs",
  use: { browserName: "chromium" },
  projects: [
    {
      name: "spa-dev",
      testMatch: "spa.spec.ts",
      use: { baseURL: `http://localhost:${ports.spaDev}` },
      grepInvert: /@prod-only/,
    },
    {
      name: "spa-prod",
      testMatch: "spa.spec.ts",
      use: { baseURL: `http://localhost:${ports.spaProd}` },
      grepInvert: /@dev-only/,
    },
    {
      name: "mpa-dev",
      testMatch: "mpa.spec.ts",
      use: { baseURL: `http://localhost:${ports.mpaDev}` },
      grepInvert: /@prod-only/,
    },
    {
      name: "mpa-prod",
      testMatch: "mpa.spec.ts",
      use: { baseURL: `http://localhost:${ports.mpaProd}` },
      grepInvert: /@dev-only/,
    },
  ],
  webServer: [
    { command: "pnpm spa:dev", port: ports.spaDev },
    { command: "pnpm spa:prod", port: ports.spaProd },
    { command: "pnpm mpa:dev", port: ports.mpaDev },
    { command: "pnpm mpa:prod", port: ports.mpaProd },
  ],
})
