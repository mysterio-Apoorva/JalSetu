import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'project.audit.live.ts', timeout: 150000,
  use: { baseURL: 'http://localhost:5174', headless: true },
  webServer: { command: 'npm run dev -- --host localhost --port 5174 --strictPort',
    url: 'http://localhost:5174', reuseExistingServer: true },
  reporter: 'list', outputDir: '../.runtime/playwright-audit',
});
