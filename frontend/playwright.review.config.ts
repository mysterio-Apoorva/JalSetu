import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'dashboard.review.live.ts', timeout: 120000,
  workers: 1, use: { baseURL: 'http://localhost:5174', headless: true },
  webServer: { command: 'npm run dev -- --host localhost --port 5174 --strictPort',
    url: 'http://localhost:5174', reuseExistingServer: false,
    env: { VITE_DATA_MODE: 'aws', VITE_ENABLE_DEMO_LOGIN: 'true' } },
  reporter: 'list', outputDir: '../.runtime/dashboard-review-browser',
});
