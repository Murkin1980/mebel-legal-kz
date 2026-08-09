import { expect, test } from '@playwright/test';

test('public login page has a Russian document language and labeled controls', async ({ page }) => {
  await page.goto('/login');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('label[for="email"]')).toBeVisible();
  await expect(page.locator('label[for="password"]')).toBeVisible();
});

test('public login controls expose keyboard focus', async ({ page }) => {
  await page.goto('/login');
  const email = page.locator('input[type="email"]');
  await email.focus();

  await expect(email).toBeFocused();
  const focusIsVisible = await email.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return styles.outlineStyle !== 'none' || styles.boxShadow !== 'none';
  });
  expect(focusIsVisible).toBe(true);
});
