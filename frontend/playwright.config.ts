import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: { headless: true },
  projects: [
    {
      name: "demo",
      testMatch: "workspaces.spec.ts",
      use: { baseURL: "http://127.0.0.1:5173" },
    },
    {
      name: "aws-contract",
      testMatch: ["aws.spec.ts", "auth.spec.ts"],
      use: { baseURL: "http://127.0.0.1:5174" },
    },
  ],
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      env: { VITE_DATA_MODE: "demo" },
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      env: {
        VITE_DATA_MODE: "aws",
        VITE_ENABLE_DEMO_LOGIN: "true",
        VITE_API_BASE_URL: "http://127.0.0.1:5174",
      },
      reuseExistingServer: false,
    },
  ],
  reporter: "list",
  outputDir: "../.runtime/playwright",
});
