import { expect, test } from '@playwright/test';
import { ensureTestUser, loginAsTestUser } from './helpers';

test.beforeAll(async () => {
  await ensureTestUser();
});

test.describe('Unified order workflow', () => {
  test('shows orders as the primary workspace', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/orders');
    await expect(page.getByRole('heading', { name: 'Заказы' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Новый заказ' })).toBeVisible();
  });

  test('captures client, item, dates and optional contract', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/orders/new');
    await expect(page.locator('input[name="customerIinBin"]')).toBeVisible();
    await expect(page.locator('input[name="customerAddress"]')).toBeVisible();
    await expect(page.locator('input[name="itemName"]')).toBeVisible();
    await expect(page.locator('input[name="itemQuantity"]')).toHaveValue('1');
    await expect(page.locator('input[name="itemUnitPrice"]')).toBeVisible();
    await expect(page.locator('input[name="contractRequired"]')).toBeVisible();
  });

  test('provides organization document requisites', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/settings/documents');
    await expect(page.getByRole('heading', { name: 'Реквизиты компании' })).toBeVisible();
    await expect(page.locator('input[name="legalName"]')).toBeVisible();
    await expect(page.locator('input[name="iinBin"]')).toBeVisible();
    await expect(page.locator('input[name="iik"]')).toBeVisible();
  });
});
