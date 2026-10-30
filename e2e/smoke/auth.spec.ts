import { expect, test } from '@playwright/test';
import { requireEnv, signInThroughHome } from '../helpers/login';

test.describe('login and anonymous access', () => {
  test('redirects anonymous /view requests to the login page', async ({ page }) => {
    await page.goto('/view');

    await expect(page).toHaveURL(/\/login\?callbackUrl=.*view/i);
    await expect(page.getByPlaceholder('Username')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('shows an error toast for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Username').fill('invalid-e2e-user');
    await page.getByPlaceholder('Password').fill('invalid-e2e-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Sign in failed')).toBeVisible();
    await expect(page.getByText('Invalid credentials. Please try again.')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });

  test('signs in with viewer credentials and reaches Reader Home', async ({ page }) => {
    const username = requireEnv('E2E_VIEWER_USERNAME');
    const password = requireEnv('E2E_VIEWER_PASSWORD');

    await signInThroughHome(page, username, password);
    await expect(page.getByRole('heading', { name: 'Where would you like to begin?' })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('button', { name: /Collections/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Feed/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toHaveCount(0);
  });

  test('preserves an explicit reader callback over the administrator default', async ({ page }) => {
    test.slow();
    const username = requireEnv('E2E_ADMIN_USERNAME');
    const password = requireEnv('E2E_ADMIN_PASSWORD');

    await page.goto('/login?callbackUrl=%2Fview%3Fmode%3Dfreeform');
    await page.getByPlaceholder('Username').fill(username);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/view\?mode=freeform$/, { timeout: 90_000 });
  });
});
