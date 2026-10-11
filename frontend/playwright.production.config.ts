import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'production.spec.ts', timeout: 30000,
  use: { headless: true, baseURL: 'http://127.0.0.1:5190' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 5190 --strictPort', url: 'http://127.0.0.1:5190', reuseExistingServer: true },
  reporter: 'list', outputDir: '../.runtime/production-browser',
});
