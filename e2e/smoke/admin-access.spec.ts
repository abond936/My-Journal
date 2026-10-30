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
    const activeCollections = await (await activeCollectionsResponse).json() as {
      collections?: Array<{ docId?: string; recordState?: string }>;
    };
    expect(activeCollections.collections).toEqual(expect.arrayContaining([
      expect.objectContaining({ docId: 'my-life', recordState: 'active' }),
    ]));
    await expect(page.getByText(/Placement-native Studio:/)).toBeVisible();
  });

  test('@admin uses the navigable active placement hierarchy in guided Reader', async ({ page }) => {
    test.setTimeout(120_000);
    const collectionsResponse = page.waitForResponse(
      (response) => response.url().endsWith('/api/collections') && response.request().method() === 'GET'
    );
    await page.goto('/view?mode=guided');
    const collections = await (await collectionsResponse).json() as {
      collections?: Array<{ docId?: string; recordState?: string }>;
    };
    expect(collections.collections).toEqual(expect.arrayContaining([
      expect.objectContaining({ docId: 'my-life', recordState: 'active' }),
    ]));
    await expect(page.getByRole('tab', { name: 'Collections' })).toHaveAttribute('aria-selected', 'true');
    const root = page.locator('button[data-placement-id][data-card-id]').first();
    await expect(root).toBeVisible({ timeout: 90_000 });

    const rootRow = root.locator('..');
    const rootDisclosure = rootRow.locator('button').first();
    const [rowBox, disclosureBox] = await Promise.all([
      root.boundingBox(),
      rootDisclosure.boundingBox(),
    ]);
    expect(rowBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(disclosureBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(disclosureBox?.height ?? 0).toBeGreaterThanOrEqual(44);

    await root.click();
    await expect(root).toHaveAttribute('aria-current', 'page');
  });
});
