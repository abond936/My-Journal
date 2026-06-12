import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '.env.local'), override: true });

const hostedBaseURL =
  process.env.E2E_BASE_URL?.trim() || process.env.PLAYWRIGHT_BASE_URL?.trim() || '';
const baseURL = hostedBaseURL || 'http://localhost:3000';
const viewerAuthFile = path.join(__dirname, 'e2e/.auth/viewer.json');
const adminAuthFile = path.join(__dirname, 'e2e/.auth/admin.json');
const useLocalWebServer = !hostedBaseURL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  ...(useLocalWebServer
    ? {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
    },
    {
      name: 'auth',
      testMatch: /smoke\/auth\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'smoke-viewer',
      testMatch: /smoke\/(reader|admin-access)\.spec\.ts/,
      grepInvert: /@admin/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: viewerAuthFile,
      },
    },
    {
      name: 'smoke-admin',
      testMatch: /smoke\/admin-access\.spec\.ts/,
      grep: /@admin/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: adminAuthFile,
      },
    },
  ],
});
