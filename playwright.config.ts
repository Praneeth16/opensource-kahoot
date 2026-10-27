// The e2e suite reads .env.local: DATABASE_URL is used to audit scores and to clean up test data.
import "./src/lib/load-env";

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "e2e",
  // Each test is a whole game with several browsers talking through one database: run them in order.
  workers: 1,
  fullyParallel: false,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    // PLAYWRIGHT_CHANNEL=chrome uses your installed Chrome instead of `npx playwright install chromium`.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Against localhost, start the dev server (port 3000: the origin Realtime allows in neon.ts).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- -p 3000",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
