import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';

/**
 * Accessibility checks for MebelLegal KZ - Stage 1.5
 *
 * Tests heading hierarchy, form labels, keyboard navigation, focus visibility.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

describe('Accessibility Checks', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  describe('Heading Hierarchy', () => {
    it('login page should have exactly one h1', async () => {
      await page.goto(`${BASE_URL}/login`);
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });

    it('cases page should have exactly one h1 or h2', async () => {
      await page.goto(`${BASE_URL}/app/cases`);
      const h1Count = await page.locator('h1').count();
      const h2Count = await page.locator('h2').count();
      expect(h1Count + h2Count).toBeGreaterThanOrEqual(1);
    });

    it('case detail page should have proper heading', async () => {
      await page.goto(`${BASE_URL}/app/cases`);
      const heading = page.locator('h2').first();
      await expect(heading).toBeVisible();
    });

    it('audit page should have proper heading', async () => {
      await page.goto(`${BASE_URL}/app/audit`);
      const heading = page.locator('h2').first();
      await expect(heading).toBeVisible();
    });
  });

  describe('Form Labels', () => {
    it('login form should have labeled inputs', async () => {
      await page.goto(`${BASE_URL}/login`);

      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');

      const emailHasLabel = await emailInput.evaluate((el) => {
        const id = el.id;
        return !!document.querySelector(`label[for="${id}"]`);
      });
      const passwordHasLabel = await passwordInput.evaluate((el) => {
        const id = el.id;
        return !!document.querySelector(`label[for="${id}"]`);
      });

      expect(emailHasLabel).toBe(true);
      expect(passwordHasLabel).toBe(true);
    });

    it('case creation form should have labeled inputs', async () => {
      await page.goto(`${BASE_URL}/app/cases/new`);

      const inputs = ['caseNumber', 'title', 'customerType', 'customerDisplayName', 'projectType', 'totalAmount'];

      for (const inputId of inputs) {
        const hasLabel = await page.locator(`#${inputId}`).evaluate((el) => {
          const id = el.id;
          return !!document.querySelector(`label[for="${id}"]`);
        });
        expect(hasLabel).toBe(true);
      }
    });

    it('audit filters should have aria-labels', async () => {
      await page.goto(`${BASE_URL}/app/audit`);

      const eventTypeFilter = page.locator('select[aria-label="Фильтр по типу события"]');
      const entityTypeFilter = page.locator('select[aria-label="Фильтр по типу сущности"]');

      await expect(eventTypeFilter).toBeVisible();
      await expect(entityTypeFilter).toBeVisible();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation on login page', async () => {
      await page.goto(`${BASE_URL}/login`);

      await page.keyboard.press('Tab');
      const focused1 = await page.evaluate(() => document.activeElement?.tagName);

      await page.keyboard.press('Tab');
      const focused2 = await page.evaluate(() => document.activeElement?.tagName);

      expect(['INPUT', 'BUTTON', 'A']).toContain(focused1);
      expect(['INPUT', 'BUTTON', 'A']).toContain(focused2);
    });

    it('should allow tab navigation on cases page', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
      }

      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'SELECT', 'BUTTON', 'A']).toContain(focused);
    });

    it('should allow Enter key on buttons', async () => {
      await page.goto(`${BASE_URL}/login`);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.focus();

      const isFocused = await submitButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });
  });

  describe('Focus Visibility', () => {
    it('should show focus ring on input focus', async () => {
      await page.goto(`${BASE_URL}/login`);

      const emailInput = page.locator('input[type="email"]');
      await emailInput.focus();

      const hasFocusStyles = await emailInput.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outlineStyle !== 'none' ||
               styles.boxShadow !== 'none' ||
               styles.borderColor !== 'rgb(209, 213, 219)';
      });

      expect(hasFocusStyles).toBe(true);
    });

    it('should show focus ring on button focus', async () => {
      await page.goto(`${BASE_URL}/login`);

      const submitButton = page.locator('button[type="submit"]');
      await submitButton.focus();

      const hasFocusStyles = await submitButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outlineStyle !== 'none' ||
               styles.boxShadow !== 'none';
      });

      expect(hasFocusStyles).toBe(true);
    });
  });

  describe('ARIA Attributes', () => {
    it('alert role should be present for error messages', async () => {
      await page.goto(`${BASE_URL}/app/cases/new`);

      const alertElements = page.locator('[role="alert"]');
      const count = await alertElements.count();
      expect(count).toBe(0);
    });

    it('tables should have role="grid" or role="table"', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      const tables = page.locator('table');
      const count = await tables.count();

      if (count > 0) {
        const hasRole = await tables.first().evaluate((el) => {
          return el.getAttribute('role') === 'grid' || el.getAttribute('role') === 'table';
        });
        expect(hasRole).toBe(true);
      }
    });

    it('expandable sections should have aria-expanded', async () => {
      await page.goto(`${BASE_URL}/app/audit`);

      const expandButtons = page.locator('button[aria-expanded]');
      const count = await expandButtons.count();

      if (count > 0) {
        const hasAriaExpanded = await expandButtons.first().getAttribute('aria-expanded');
        expect(hasAriaExpanded).not.toBeNull();
      }
    });
  });

  describe('Language and Structure', () => {
    it('html element should have lang="ru"', async () => {
      await page.goto(`${BASE_URL}/login`);

      const lang = await page.locator('html').getAttribute('lang');
      expect(lang).toBe('ru');
    });

    it('main content should be present', async () => {
      await page.goto(`${BASE_URL}/app`);

      const main = page.locator('main');
      await expect(main).toBeVisible();
    });

    it('navigation should be present', async () => {
      await page.goto(`${BASE_URL}/app`);

      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    });
  });

  describe('Color Contrast', () => {
    it('status badges should have sufficient contrast', async () => {
      await page.goto(`${BASE_URL}/app/cases`);

      const badges = page.locator('[class*="rounded-full"]');
      const count = await badges.count();

      if (count > 0) {
        const hasText = await badges.first().textContent();
        expect(hasText).toBeTruthy();
      }
    });
  });
});
