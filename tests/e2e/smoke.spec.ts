import { test, expect, type Page } from '@playwright/test';

/**
 * E2E Smoke Tests for MebelLegal KZ - Stage 1.5
 *
 * Tests critical user path:
 * Login → Organization → Case List → Create Case → Case Detail → Audit Log
 *
 * Uses synthetic data only. No real data.
 */

test.describe('Login Page', () => {
  test('should render login form', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/login');

    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/MebelLegal KZ/);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/login');

    const emailLabel = page.locator('label[for="email"]');
    const passwordLabel = page.locator('label[for="password"]');

    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });

  test('should show stage 1 warning', async ({ page }) => {
    await page.goto('/login');

    const warning = page.locator('text=Этап 1');
    await expect(warning).toBeVisible();
  });
});

test.describe('App Layout', () => {
  test('should have navigation links', async ({ page }) => {
    await page.goto('/app');

    const casesLink = page.locator('a[href="/app/cases"]');
    const auditLink = page.locator('a[href="/app/audit"]');

    await expect(casesLink).toBeVisible();
    await expect(auditLink).toBeVisible();
  });

  test('should show stage 1 banner', async ({ page }) => {
    await page.goto('/app');

    const banner = page.locator('text=Юридические документы и проверка законодательства ещё не подключены');
    await expect(banner).toBeVisible();
  });
});

test.describe('Case List Page', () => {
  test('should render case list with filters', async ({ page }) => {
    await page.goto('/app/cases');

    const searchInput = page.locator('input[type="search"]');
    const statusFilter = page.locator('select[aria-label="Фильтр по статусу"]');
    const customerTypeFilter = page.locator('select[aria-label="Фильтр по типу клиента"]');
    const projectTypeFilter = page.locator('select[aria-label="Фильтр по типу проекта"]');

    await expect(searchInput).toBeVisible();
    await expect(statusFilter).toBeVisible();
    await expect(customerTypeFilter).toBeVisible();
    await expect(projectTypeFilter).toBeVisible();
  });

  test('should have sortable column headers', async ({ page }) => {
    await page.goto('/app/cases');

    const sortButtons = page.locator('button[aria-label^="Сортировать"]');
    const count = await sortButtons.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('should show empty state or table', async ({ page }) => {
    await page.goto('/app/cases');

    const emptyState = page.locator('text=Нет кейсов');
    const caseTable = page.locator('table');

    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasTable = await caseTable.isVisible().catch(() => false);

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

    const backButton = page.locator('button:has-text("Назад")');
    await expect(backButton).toBeVisible();
  });
});

test.describe('Audit Page', () => {
  test('should render audit log with filters', async ({ page }) => {
    await page.goto('/app/audit');

    await expect(page.locator('select[aria-label="Фильтр по типу события"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Фильтр по типу сущности"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Дата от"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Дата до"]')).toBeVisible();
  });

  test('should show read-only notice', async ({ page }) => {
    await page.goto('/app/audit');

    const notice = page.locator('text=Только чтение');
    await expect(notice).toBeVisible();
  });

  test('should show append-only notice', async ({ page }) => {
    await page.goto('/app/audit');

    const notice = page.locator('text=История дополнена и не может быть изменена');
    await expect(notice).toBeVisible();
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
    await page.goto('/app/cases');

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
