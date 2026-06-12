import { expect, test } from '@playwright/test';

test.describe('reader feed', () => {
  test('renders published cards and opens card detail', async ({ page }) => {
    await page.goto('/view');

    const firstCardLink = page.locator('a[data-card-id]').first();
    await expect(firstCardLink).toBeVisible({ timeout: 45_000 });

    const cardId = await firstCardLink.getAttribute('data-card-id');
    expect(cardId).toBeTruthy();

    await firstCardLink.click();
    await expect(page).toHaveURL(new RegExp(`/view/${cardId}(\\?|$)`));

    await expect(page.locator('h1').first()).toBeVisible();
  });
});
