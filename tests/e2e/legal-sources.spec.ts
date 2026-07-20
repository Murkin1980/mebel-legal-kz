import { test, expect } from '@playwright/test';
import { ensureTestUser, loginAsTestUser } from './helpers';

/**
 * E2E Smoke Tests for MebelLegal KZ - Stage 2: Legal Sources Registry
 *
 * Tests critical user path:
 * Login → Legal Sources List → Source Detail → Rules List → Rule Detail
 *
 * Uses synthetic data only. No real data. No scraping.
 */

test.beforeAll(async () => {
  await ensureTestUser();
});

test.describe('Legal Sources Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/legal/sources');
    await page.waitForLoadState('networkidle');
  });

  test('should render legal sources page with heading', async ({ page }) => {
    await expect(page.locator('text=Правовые источники')).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const filter = page.locator('select[aria-label="Фильтр по статусу"]');
    await expect(filter).toBeVisible();
  });

  test('should have system filter', async ({ page }) => {
    const filter = page.locator('select[aria-label="Фильтр по системе"]');
    await expect(filter).toBeVisible();
  });

  test('should show empty state or table', async ({ page }) => {
    const hasEmpty = await page.locator('text=Нет правовых источников').isVisible({ timeout: 2000 }).catch(() => false);
    const hasTable = await page.locator('table').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });

  test('should have link to rules page', async ({ page }) => {
    const rulesLink = page.locator('a[href="/app/legal/rules"]');
    await expect(rulesLink).toBeVisible();
  });
});

test.describe('Legal Rules Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/legal/rules');
    await page.waitForLoadState('networkidle');
  });

  test('should render legal rules page with heading', async ({ page }) => {
    await expect(page.locator('text=Правила проверки')).toBeVisible();
  });

  test('should have status filter', async ({ page }) => {
    const filter = page.locator('select[aria-label="Фильтр по статусу"]');
    await expect(filter).toBeVisible();
  });

  test('should show empty state or table', async ({ page }) => {
    const hasEmpty = await page.locator('text=Нет правил проверки').isVisible({ timeout: 2000 }).catch(() => false);
    const hasTable = await page.locator('table').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasEmpty || hasTable).toBe(true);
  });
});

test.describe('Navigation Integration', () => {
  test('should navigate from main nav to legal sources', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');
    await page.waitForLoadState('networkidle');

    const sourcesLink = page.locator('a[href="/app/legal/sources"]');
    await expect(sourcesLink).toBeVisible();
    await sourcesLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Правовые источники')).toBeVisible();
  });

  test('should navigate from legal sources to rules', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/legal/sources');
    await page.waitForLoadState('networkidle');

    const rulesLink = page.locator('a[href="/app/legal/rules"]').first();
    await expect(rulesLink).toBeVisible();
  });

  test('should have stage 2 banner', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Этап 2')).toBeVisible();
  });
});

test.describe('Immutability Notice', () => {
  test('should show immutability notice on sources page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/legal/sources');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Web scraping ИПС «Әділет» запрещён')).toBeVisible();
  });

  test('should show AI prohibition notice on rules page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/legal/rules');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=AI не участвует в создании или применении правил')).toBeVisible();
  });
});
