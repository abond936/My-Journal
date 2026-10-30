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

});
