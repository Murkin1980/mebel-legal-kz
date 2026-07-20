import { test, expect } from '@playwright/test';
import { ensureTestUser, loginAsTestUser } from './helpers';

/**
 * E2E Smoke Tests for MebelLegal KZ - Stage 1.5
 *
 * Tests critical user path:
 * Login → Organization → Case List → Create Case → Case Detail → Audit Log
 *
 * Uses synthetic data only. No real data.
 */

test.beforeAll(async () => {
  await ensureTestUser();
});

test.describe('Login Page', () => {
  test('should render login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/login');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/MebelLegal KZ/);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
  });

  test('should show stage 1 warning', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('text=Этап 1')).toBeVisible();
  });
});

test.describe('App Layout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('should have navigation links', async ({ page }) => {
    await expect(page.locator('a[href="/app/cases"]')).toBeVisible();
    await expect(page.locator('a[href="/app/audit"]')).toBeVisible();
  });

  test('should show stage banner', async ({ page }) => {
    const banner = page.locator('text=Этап');
    await expect(banner).toBeVisible();
  });
});

test.describe('Case List Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');
    await page.waitForLoadState('networkidle');
  });

  test('should render case list with filters', async ({ page }) => {
    await expect(page.locator('input[type="search"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Фильтр по статусу"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Фильтр по типу клиента"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Фильтр по типу проекта"]')).toBeVisible();
  });

  test('should have sortable column headers when cases exist', async ({ page }) => {
    const table = page.locator('table');
    if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
      const sortButtons = page.locator('button[aria-label^="Сортировать"]');
      const count = await sortButtons.count();
      expect(count).toBeGreaterThanOrEqual(4);
    }
  });

  test('should show empty state or table', async ({ page }) => {
    const hasEmptyState = await page.locator('text=Нет кейсов').isVisible().catch(() => false);
    const hasTable = await page.locator('table').isVisible().catch(() => false);
    expect(hasEmptyState || hasTable).toBe(true);
  });
});

test.describe('Create Case Page', () => {
  test('should render case creation form', async ({ page }) => {
    await page.goto('/app/cases/new');

    await expect(page.locator('#caseNumber')).toBeVisible();
    await expect(page.locator('#title')).toBeVisible();
    await expect(page.locator('#customerType')).toBeVisible();
    await expect(page.locator('#customerDisplayName')).toBeVisible();
    await expect(page.locator('#projectType')).toBeVisible();
    await expect(page.locator('#totalAmount')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/app/cases/new');

    const labels = page.locator('label');
    const count = await labels.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should have required field indicators', async ({ page }) => {
    await page.goto('/app/cases/new');

    const requiredIndicators = page.locator('span.text-red-500');
    const count = await requiredIndicators.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should have back navigation', async ({ page }) => {
    await page.goto('/app/cases/new');

    await expect(page.locator('button:has-text("Назад")')).toBeVisible();
  });
});

test.describe('Audit Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/audit');
    await page.waitForLoadState('networkidle');
  });

  test('should render audit log with filters', async ({ page }) => {
    await expect(page.locator('select[aria-label="Фильтр по типу события"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Фильтр по типу сущности"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Дата от"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Дата до"]')).toBeVisible();
  });

  test('should show read-only notice', async ({ page }) => {
    await expect(page.locator('text=Только чтение')).toBeVisible();
  });

  test('should show append-only notice or empty state', async ({ page }) => {
    const hasNotice = await page.locator('text=История дополнена и не может быть изменена').isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=Нет событий аудита').isVisible({ timeout: 2000 }).catch(() => false);
    expect(hasNotice || hasEmptyState).toBe(true);
  });
});

test.describe('Keyboard Navigation', () => {
  test('should allow tab navigation on login page', async ({ page }) => {
    await page.goto('/login');

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focused);
  });

  test('should allow tab navigation on cases page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'SELECT', 'BUTTON', 'A']).toContain(focused);
  });
});

test.describe('Focus Visibility', () => {
  test('should show focus ring on interactive elements', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();

    const hasFocusRing = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;
      const styles = window.getComputedStyle(el);
      return styles.outlineStyle !== 'none' || styles.boxShadow !== 'none';
    });

    expect(hasFocusRing).toBe(true);
  });
});
