import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "auth.spec.ts",
  timeout: 30000,
  use: { headless: true, baseURL: "http://127.0.0.1:5184" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5184 --strictPort",
    url: "http://127.0.0.1:5184",
    env: {
      VITE_DATA_MODE: "aws",
      VITE_ENABLE_DEMO_LOGIN: "true",
      VITE_API_BASE_URL: "http://127.0.0.1:5184",
    },
    reuseExistingServer: false,
  },
  reporter: "list",
  outputDir: "../.runtime/registration-browser",
});
