import { defineConfig, devices } from "@playwright/test";

const E2E_UI_PORT = process.env.E2E_UI_PORT || "3010";

export default defineConfig({
  testDir: "e2e/ops-profile",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  globalTeardown: "./playwright.ops-profile.teardown.ts",

  webServer: {
    command: `E2E_UI_PORT=${E2E_UI_PORT} docker compose -f docker-compose.ops-profile.yml up --build`,
    url: `http://localhost:${E2E_UI_PORT}/health`,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },

  use: {
    baseURL: `http://localhost:${E2E_UI_PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
