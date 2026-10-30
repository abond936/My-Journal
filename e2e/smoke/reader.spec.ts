import { expect, test } from '@playwright/test';

test.describe('reader entry and feed', () => {
  test('chooses Feed from Reader Home, renders cards, and opens card detail', async ({ page }) => {
    let cardListRequests = 0;
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/cards') cardListRequests += 1;
    });

    await page.goto('/view');

    await expect(page.getByRole('heading', { name: 'Where would you like to begin?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toHaveCount(0);
    expect(cardListRequests).toBe(0);
    await page.getByRole('button', { name: /Feed/ }).click();
    await expect(page).toHaveURL(/\/view\?mode=freeform$/);
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feed', exact: true })).toBeVisible();
    await expect(page.getByText('Stories from', { exact: true })).toBeVisible();
    await expect(page.getByText('This archive', { exact: true })).toBeVisible();

    const whatSummary = page.getByRole('button', { name: 'Open What filters' });
    await expect(whatSummary).toContainText('All');
    await whatSummary.click();
    await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    await expect(page.getByRole('tab', { name: 'What', exact: true })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    if ((page.viewportSize()?.width ?? 1000) <= 768) {
      await page.getByRole('button', { name: 'Toggle sidebar' }).click();
      await expect(page.getByRole('button', { name: 'Toggle sidebar' })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    }

    const firstCardLink = page.locator('a[data-card-id]').first();
    await expect(firstCardLink).toBeVisible({ timeout: 45_000 });
    expect(cardListRequests).toBeGreaterThan(0);

    const cardId = await firstCardLink.getAttribute('data-card-id');
    expect(cardId).toBeTruthy();

    await firstCardLink.click();
    await expect(page).toHaveURL(new RegExp(`/view/${cardId}(\\?|$)`));

    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('uses full-row Collection navigation and shows the selected path', async ({ page }) => {
    await page.goto('/view?mode=guided');

    const isMobileViewport = (page.viewportSize()?.width ?? 1000) <= 768;
    if (isMobileViewport) {
      await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    }

    const root = page.locator(
      'button[data-collection-level="0"][data-collection-has-children="true"]'
    ).first();
    await expect(root).toBeVisible({ timeout: 45_000 });

    const rootTitle = await root.getAttribute('data-collection-title');
    expect(rootTitle).toBeTruthy();
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
    await expect(page.getByRole('heading', { name: rootTitle!, exact: true })).toBeVisible();

    if (isMobileViewport) {
      const sidebarToggle = page.getByRole('button', { name: 'Toggle sidebar' });
      await expect(sidebarToggle).toHaveAttribute('aria-expanded', 'false');
      await sidebarToggle.click();
    }

    const nestedParent = page.locator(
      'button[data-collection-level="1"][data-collection-has-children="true"]'
    ).first();
    await expect(nestedParent).toBeVisible();
    const nestedTitle = await nestedParent.getAttribute('data-collection-title');
    expect(nestedTitle).toBeTruthy();

    await nestedParent.click();
    await expect(page.getByRole('heading', { name: nestedTitle!, exact: true })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Collection breadcrumb' })).toContainText(
      rootTitle!
    );
  });
});
