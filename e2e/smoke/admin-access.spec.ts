import { expect, test } from '@playwright/test';

test.describe('viewer admin boundary', () => {
  test('does not load the admin studio shell', async ({ page }) => {
    await page.goto('/admin/studio');

    await expect(page.getByRole('searchbox', { name: /cards/i })).toHaveCount(0, {
      timeout: 15_000,
    });

    const pathname = new URL(page.url()).pathname;
    expect(pathname).not.toBe('/admin/studio');
  });
});

test.describe('admin studio access', () => {
  test('@admin reaches the studio card bank', async ({ page }) => {
    await page.goto('/admin/studio');

    await expect(page.getByRole('heading', { name: 'Studio', exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('button', { name: 'Clear card filters' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search card titles' })).toBeVisible();
  });
});
