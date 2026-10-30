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

  test('signs in with viewer credentials and reaches the reader feed', async ({ page }) => {
    const username = requireEnv('E2E_VIEWER_USERNAME');
    const password = requireEnv('E2E_VIEWER_PASSWORD');

    await signInThroughHome(page, username, password);
    await expect(page.locator('a[data-card-id]').first()).toBeVisible({ timeout: 45_000 });
  });
});
