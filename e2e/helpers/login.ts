import { expect, type Page } from '@playwright/test';

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export async function signInThroughHome(
  page: Page,
  username: string,
  password: string,
  expectedEntry: '/view' | '/admin' = '/view'
): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('Username').fill(username);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  const expectedUrl = expectedEntry === '/admin'
    ? /\/admin(?:\/|\?|$)/
    : /\/view(?:\/|\?|$)/;
  await expect(page).toHaveURL(expectedUrl, { timeout: 45_000 });
}
