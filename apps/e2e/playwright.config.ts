import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;

// Use dedicated ports to avoid conflicts with dev servers
const API_PORT = 3100;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',

  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin.json',
      },
      dependencies: ['auth-setup'],
      testIgnore: /auth\/(login|register|forgot-password)\.spec\.ts/,
    },
    {
      name: 'chromium-no-auth',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['auth-setup'],
      testMatch: [
        /smoke\/.+\.spec\.ts/,
        /auth\/(login|register|forgot-password)\.spec\.ts/,
      ],
    },
  ],

  webServer: [
    {
      command: `pnpm dev:api`,
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !isCI,
      cwd: '../..',
      env: { PORT: String(API_PORT), DISABLE_RATE_LIMIT: 'true' },
      timeout: 30_000,
    },
    {
      command: `pnpm --filter web exec vite --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: !isCI,
      cwd: '../..',
      env: { API_TARGET: `http://localhost:${API_PORT}` },
      timeout: 30_000,
    },
  ],
});
