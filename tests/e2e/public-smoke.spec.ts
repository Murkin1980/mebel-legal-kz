import { expect, test } from '@playwright/test';

test('public login page renders without database credentials', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('MebelLegal KZ');
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test('unknown approval link fails closed without exposing contract data', async ({ page }) => {
  const response = await page.goto('/approve/invalid-token');

  expect(response?.status()).toBe(404);
  await expect(page.locator('body')).not.toContainText('content_snapshot');
});
