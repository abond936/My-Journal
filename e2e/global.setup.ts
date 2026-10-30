import { test as setup } from '@playwright/test';
import path from 'path';
import { requireEnv, signInThroughHome } from './helpers/login';

const viewerAuthFile = path.join(__dirname, '.auth/viewer.json');
const adminAuthFile = path.join(__dirname, '.auth/admin.json');

setup('authenticate viewer', async ({ page }) => {
  const username = requireEnv('E2E_VIEWER_USERNAME');
  const password = requireEnv('E2E_VIEWER_PASSWORD');

  await signInThroughHome(page, username, password);
  await page.context().storageState({ path: viewerAuthFile });
});

setup('authenticate admin', async ({ page }) => {
  const username = requireEnv('E2E_ADMIN_USERNAME');
  const password = requireEnv('E2E_ADMIN_PASSWORD');

  await signInThroughHome(page, username, password);
  await page.context().storageState({ path: adminAuthFile });
});
