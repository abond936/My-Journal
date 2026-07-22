import { expect, test } from '@playwright/test';

test.describe('admin card save', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('@admin saves reader quick-edit metadata via PATCH', async ({ page }) => {
    await page.goto('/view');

    const firstCardLink = page.locator('a[data-card-id]').first();
    await expect(firstCardLink).toBeVisible({ timeout: 45_000 });

    const cardId = await firstCardLink.getAttribute('data-card-id');
    expect(cardId).toBeTruthy();

    await firstCardLink.click();
    await expect(page).toHaveURL(new RegExp(`/view/${cardId}(\\?|$)`));

    const editButton = page.getByRole('button', { name: 'Edit open card', exact: true });
    await expect(editButton).toBeVisible({ timeout: 15_000 });

    await editButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick edit' })).toBeVisible();

    const subtitleInput = page.locator('#reader-quick-edit-subtitle');
    const originalSubtitle = await subtitleInput.inputValue();
    const marker = `e2e-${Date.now()}`;
    const editedSubtitle = originalSubtitle ? `${originalSubtitle} ${marker}` : marker;

    const expectSubtitlePatch = (expectedSubtitle: string) =>
      page
        .waitForResponse(
          (response) =>
            response.url().includes(`/api/cards/${cardId}`) &&
            response.request().method() === 'PATCH' &&
            response.ok(),
          { timeout: 30_000 }
        )
        .then(async (response) => {
          const body = (await response.json()) as { subtitle?: string | null };
          expect(body.subtitle ?? '').toBe(expectedSubtitle);
        });

    try {
      await subtitleInput.fill(editedSubtitle);
      const patchPromise = expectSubtitlePatch(editedSubtitle);
      await page.getByRole('button', { name: 'Save' }).click();
      await patchPromise;
      await expect(page.getByText('Card updated.')).toBeVisible();
    } finally {
      await editButton.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await subtitleInput.fill(originalSubtitle);
      const restorePromise = expectSubtitlePatch(originalSubtitle);
      await page.getByRole('button', { name: 'Save' }).click();
      await restorePromise;
    }
  });
});
