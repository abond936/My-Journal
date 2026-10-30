import { expect, test } from '@playwright/test';

test.describe('viewer admin boundary', () => {
  test('does not load the admin studio shell', async ({ page }) => {
    await page.goto('/admin/studio');

    await expect(page.getByRole('searchbox', { name: /cards/i })).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('cannot open the Collection shadow preview', async ({ page }) => {
    await page.goto('/admin/collections/preview/my-life');

    await expect(page.getByRole('heading', { name: 'My Life' })).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByRole('alert')).toBeVisible();
  });
});

test.describe('admin studio access', () => {
  test('@admin reaches the read-only author dashboard', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin');

    await expect(page.getByRole('heading', { name: 'What would you like to work on?' })).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByRole('heading', { name: 'Cards' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Media' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Archive operations' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue in Studio' })).toHaveAttribute(
      'href',
      '/admin/studio'
    );
  });

  test('@admin reaches the studio card bank', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/studio');

    await expect(page.getByRole('heading', { name: 'Studio', exact: true })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('button', { name: 'Clear card filters' })).toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Search card titles' })).toBeVisible();
    const activeCollectionsResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/admin/collections') && response.request().method() === 'GET'
    );
    await page.getByRole('button', { name: 'Collections', exact: true }).click();
    const activeCollections = await (await activeCollectionsResponse).json() as { collections?: unknown[] };
    expect(activeCollections.collections).toEqual([]);
    await expect(page.getByText(/Placement-native Studio:/)).toHaveCount(0);
  });

  test('@admin previews the inactive My Life placement hierarchy', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/admin/collections/preview/my-life');

    await expect(page.getByRole('heading', { name: 'My Life' })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText('Placement-native shadow structure. Reader and Studio still use the legacy hierarchy.')).toBeVisible();
    await expect(page.getByLabel('Collection state')).toContainText('shadow');
    await expect(page.getByLabel('Projection summary')).toContainText('197');
    await expect(page.getByRole('heading', { name: 'WELCOME' })).toBeVisible();
    await expect(page.getByText('Parity current')).toBeVisible();
    await expect(page.getByText('Part', { exact: true })).toHaveCount(1);
    await expect(page.getByText('Reused Cards').locator('..').getByText('2')).toBeVisible();
    await expect(page.getByText('Reused Card', { exact: true })).toHaveCount(4);
  });

  test('@admin retains legacy guided Reader while the durable Collection is shadow', async ({ page }) => {
    test.setTimeout(120_000);
    const collectionsResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/collections') && response.request().method() === 'GET'
    );
    await page.goto('/view?mode=guided');
    const collections = await (await collectionsResponse).json() as { collections?: unknown[] };
    expect(collections.collections).toEqual([]);
    await expect(page.getByRole('tab', { name: 'Collections' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: /^My Life/ })).toBeVisible({ timeout: 90_000 });
  });
});
