import { expect, test } from '@playwright/test';
import { ensureTestUser, loginAsTestUser } from './helpers';

test.beforeAll(async () => {
  await ensureTestUser();
});

test.describe('Archive import workspace', () => {
  test('shows template, upload, preview action and tenant history', async ({
    page,
  }) => {
    await loginAsTestUser(page);
    await page.goto('/app/imports');

    await expect(
      page.getByRole('heading', { name: 'Импорт бухгалтерского архива' }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Скачать шаблон ZIP' }),
    ).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Партии импорта' }),
    ).toBeVisible();

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: 'output/playwright/stage-03/imports-desktop.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'output/playwright/stage-03/imports-mobile.png',
      fullPage: true,
    });
  });

  test('downloads a ZIP template', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/imports');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Скачать шаблон ZIP' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(
      'mebeldocs-import-template.zip',
    );
  });
});
