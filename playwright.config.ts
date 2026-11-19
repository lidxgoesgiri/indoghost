import { defineConfig } from '@playwright/test';

// A separate origin keeps automated playthroughs isolated from the player's journal.
const url = 'http://127.0.0.1:4185';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 65_000,
  expect: { timeout: 8_000 },
  reporter: 'list',
  use: {
    baseURL: url,
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    channel: process.env.PW_CHANNEL || undefined,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4185',
    url,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
