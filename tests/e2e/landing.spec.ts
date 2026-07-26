import { test, expect } from '@playwright/test';

test.describe('Public landing', () => {
  test('explains the order workflow and links to the workspace', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/MebelDocs/);
    await expect(
      page.getByRole('heading', { level: 1, name: /Весь заказ/ })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Открыть рабочее пространство/ }))
      .toHaveAttribute('href', '/login');
    await expect(page.getByText('От заказа до закрывающих документов')).toBeVisible();
    await expect(page.getByText('Счёт на оплату', { exact: true })).toBeVisible();
    await expect(page.getByText('Акт выполненных работ', { exact: true })).toBeVisible();
  });

  test('fits a mobile viewport without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
  });

  test('has a single primary heading and semantic navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Основная навигация' }))
      .toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  });
});
