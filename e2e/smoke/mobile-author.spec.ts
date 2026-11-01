import { expect, test } from '@playwright/test';

test.describe('mobile Author journey', () => {
  test('@admin reaches focused destinations and the unsaved Story workflow without writes', async ({ page }) => {
    test.setTimeout(120_000);
    const unexpectedWrites: string[] = [];

    page.on('request', (request) => {
      const method = request.method();
      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/') && method !== 'GET' && method !== 'HEAD') {
        unexpectedWrites.push(`${method} ${url.pathname}`);
      }
    });

    await page.goto('/admin/help');
    await expect(page.getByRole('heading', { level: 1, name: "MY STORIES USER'S GUIDE" })).toBeVisible({
      timeout: 45_000,
    });
    await expect(page.getByRole('heading', { level: 2, name: '2. Start Small' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: '10. Worked Examples' })).toBeVisible();

    await page.goto('/admin/studio');

    const destinations = page.getByRole('navigation', { name: 'Author destinations' });
    await expect(destinations).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('heading', { name: 'Cards', exact: true })).toBeVisible();
    for (const label of ['Cards', 'Media', 'Prompts', 'Collections', 'Tags']) {
      await expect(destinations.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    await page.goto('/admin');
    const startStory = page.getByRole('link', { name: 'Start a Story' });
    await expect(startStory).toBeVisible({ timeout: 90_000 });
    await startStory.click();

    await expect(page).toHaveURL(/\/admin\/studio\?(?:.*&)?new=1(?:&|$)/);
    const workflow = page.getByRole('navigation', { name: 'Story workflow' });
    await expect(workflow).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('navigation', { name: 'Author destinations' })).toHaveCount(0);

    for (const label of ['Words', 'Media', 'Details', 'Placement', 'Preview']) {
      const step = workflow.getByRole('button', { name: label, exact: true });
      await expect(step).toBeVisible();
      await step.click();
      await expect(step).toHaveAttribute('aria-current', 'step');
    }

    expect(unexpectedWrites).toEqual([]);
  });
});
