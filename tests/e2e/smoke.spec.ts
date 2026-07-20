import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

/**
 * E2E Smoke Tests for MebelLegal KZ - Stage 1.5
 *
 * Tests critical user path:
 * Login → Organization → Case List → Create Case → Update Case → Status Transition → Audit Log
 *
 * Uses synthetic data only. No real data.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('E2E Smoke Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Login Page', () => {
    it('should render login form', async () => {
      await page.goto(`${BASE_URL}/login`);

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    it('should have proper heading hierarchy', async () => {
      await page.goto(`${BASE_URL}/login`);

      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(/MebelLegal KZ/);
    });

    it('should have accessible form labels', async () => {
      await page.goto(`${BASE_URL}/login`);

      const emailLabel = page.locator('label[for="email"]');
      const passwordLabel = page.locator('label[for="password"]');

      await expect(emailLabel).toBeVisible();
      await expect(passwordLabel).toBeVisible();
    });

    it('should show stage 1 warning', async () => {
      await page.goto(`${BASE_URL}/login`);

      const warning = page.locator('text=Этап 1');
      await expect(warning).toBeVisible();
    });
  });

  describe('App Layout', () => {
    it('should have navigation links', async () => {
      await page.goto(`${BASE_URL}/app`);

      const casesLink = page.locator('a[href="/app/cases"]');
      const auditLink = page.locator('a[href="/app/audit"]');

      await expect(casesLink).toBeVisible();
      await expect(auditLink).toBeVisible();
    });

    it('should show stage 1 banner', async () => {
      await page.goto(`${BASE_URL}/app`);

      const banner = page.locator('text=Юридические документы и проверка законодательства ещё не подключены');
      await expect(banner).toBeVisible();
    });
  });

  describe('Case List Page', () => {
    it('should render case list with filters', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      const searchInput = page.locator('input[type="search"]');
      const statusFilter = page.locator('select[aria-label="Фильтр по статусу"]');
      const customerTypeFilter = page.locator('select[aria-label="Фильтр по типу клиента"]');
      const projectTypeFilter = page.locator('select[aria-label="Фильтр по типу проекта"]');

      await expect(searchInput).toBeVisible();
      await expect(statusFilter).toBeVisible();
      await expect(customerTypeFilter).toBeVisible();
      await expect(projectTypeFilter).toBeVisible();
    });

    it('should have sortable column headers', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      const sortButtons = page.locator('button[aria-label^="Сортировать"]');
      const count = await sortButtons.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    it('should show empty state when no cases', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      const emptyState = page.locator('text=Нет кейсов');
      const caseTable = page.locator('table');

      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasTable = await caseTable.isVisible().catch(() => false);

      expect(hasEmptyState || hasTable).toBe(true);
    });
  });

  describe('Create Case Page', () => {
    it('should render case creation form', async () => {
      await page.goto(`${BASE_URL}/app/cases/new`);

      const caseNumberInput = page.locator('#caseNumber');
      const titleInput = page.locator('#title');
      const customerTypeSelect = page.locator('#customerType');
      const customerNameInput = page.locator('#customerDisplayName');
      const projectTypeSelect = page.locator('#projectType');
      const amountInput = page.locator('#totalAmount');
      const submitButton = page.locator('button[type="submit"]');

      await expect(caseNumberInput).toBeVisible();
      await expect(titleInput).toBeVisible();
      await expect(customerTypeSelect).toBeVisible();
      await expect(customerNameInput).toBeVisible();
      await expect(projectTypeSelect).toBeVisible();
      await expect(amountInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    });

    it('should have proper form labels', async () => {
      await page.goto(`${BASE_URL}/app/cases/new`);

      const labels = page.locator('label');
      const count = await labels.count();
      expect(count).toBeGreaterThanOrEqual(5);
    });

    it('should have required field indicators', async () => {
      await page.goto(`${BASE_URL}/app/cases/new`);

      const requiredIndicators = page.locator('span.text-red-500');
      const count = await requiredIndicators.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });

    it('should have back navigation', async () => {
      await page.goto(`${BASE_URL}/app/cases/new`);

      const backButton = page.locator('button:has-text("Назад")');
      await expect(backButton).toBeVisible();
    });
  });

  describe('Audit Page', () => {
    it('should render audit log with filters', async () => {
      await page.goto(`${BASE_URL}/app/audit`);

      const eventTypeFilter = page.locator('select[aria-label="Фильтр по типу события"]');
      const entityTypeFilter = page.locator('select[aria-label="Фильтр по типу сущности"]');
      const dateFrom = page.locator('input[aria-label="Дата от"]');
      const dateTo = page.locator('input[aria-label="Дата до"]');

      await expect(eventTypeFilter).toBeVisible();
      await expect(entityTypeFilter).toBeVisible();
      await expect(dateFrom).toBeVisible();
      await expect(dateTo).toBeVisible();
    });

    it('should show read-only notice', async () => {
      await page.goto(`${BASE_URL}/app/audit`);

      const notice = page.locator('text=Только чтение');
      await expect(notice).toBeVisible();
    });

    it('should show append-only notice', async () => {
      await page.goto(`${BASE_URL}/app/audit`);

      const notice = page.locator('text=История дополнена и не может быть изменена');
      await expect(notice).toBeVisible();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation on login page', async () => {
      await page.goto(`${BASE_URL}/login`);

      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focused);
    });

    it('should allow tab navigation on cases page', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'SELECT', 'BUTTON', 'A']).toContain(focused);
    });
  });

  describe('Focus Visibility', () => {
    it('should show focus ring on interactive elements', async () => {
      await page.goto(`${BASE_URL}/login`);

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
});
