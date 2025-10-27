import { defineConfig, devices } from '@playwright/test';
import baseConfig from '../../playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '../../tests/e2e',
  timeout: 60 * 1000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-qa', open: 'never' }]],
  use: {
    ...baseConfig.use,
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'https://qa.ocma.example.com',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: {
      ...(baseConfig.use?.extraHTTPHeaders || {}),
      'x-qa-run': 'true',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
});
