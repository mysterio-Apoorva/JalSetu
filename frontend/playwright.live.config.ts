import { defineConfig } from "@playwright/test";
// Explicit opt-in: signs in to the existing demo accounts and only reads API data.
export default defineConfig({
  testDir: "./tests",
  testMatch: "auth.live.ts",
  timeout: 90000,
  use: { baseURL: "http://localhost:5174", headless: true },
  webServer: {
    command: "npm run dev -- --host localhost --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    env: {
      VITE_DATA_MODE: "aws",
      VITE_ENABLE_DEMO_LOGIN: "true",
      VITE_API_BASE_URL:
        "https://qxa58ayy64.execute-api.us-east-1.amazonaws.com",
    },
  },
  reporter: "list",
  outputDir: "../.runtime/playwright-live",
});
