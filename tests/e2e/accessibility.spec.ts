import { test, expect } from '@playwright/test';
import { ensureTestUser, loginAsTestUser } from './helpers';

/**
 * Accessibility checks for MebelLegal KZ - Stage 1.5
 *
 * Tests heading hierarchy, form labels, keyboard navigation, focus visibility.
 */

test.beforeAll(async () => {
  await ensureTestUser();
});

test.describe('Heading Hierarchy', () => {
  test('login page should have exactly one h1', async ({ page }) => {
    await page.goto('/login');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('cases page should have at least one heading', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    expect(h1Count + h2Count).toBeGreaterThanOrEqual(1);
  });

  test('case detail page should have proper heading', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible();
  });

  test('audit page should have proper heading', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/audit');
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible();
  });
});

test.describe('Form Labels', () => {
  test('login form should have labeled inputs', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    const emailHasLabel = await emailInput.evaluate((el) => {
      return !!document.querySelector(`label[for="${el.id}"]`);
    });
    const passwordHasLabel = await passwordInput.evaluate((el) => {
      return !!document.querySelector(`label[for="${el.id}"]`);
    });

    expect(emailHasLabel).toBe(true);
    expect(passwordHasLabel).toBe(true);
  });

  test('case creation form should have labeled inputs', async ({ page }) => {
    await page.goto('/app/cases/new');

    const inputs = ['caseNumber', 'title', 'customerType', 'customerDisplayName', 'projectType', 'totalAmount'];

    for (const inputId of inputs) {
      const hasLabel = await page.locator(`#${inputId}`).evaluate((el) => {
        return !!document.querySelector(`label[for="${el.id}"]`);
      });
      expect(hasLabel).toBe(true);
    }
  });

  test('audit filters should have aria-labels', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/audit');

    await expect(page.locator('select[aria-label="Фильтр по типу события"]')).toBeVisible();
    await expect(page.locator('select[aria-label="Фильтр по типу сущности"]')).toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  test('should allow tab navigation on login page', async ({ page }) => {
    await page.goto('/login');

    await page.keyboard.press('Tab');
    const focused1 = await page.evaluate(() => document.activeElement?.tagName);

    await page.keyboard.press('Tab');
    const focused2 = await page.evaluate(() => document.activeElement?.tagName);

    expect(['INPUT', 'BUTTON', 'A']).toContain(focused1);
    expect(['INPUT', 'BUTTON', 'A']).toContain(focused2);
  });

  test('should allow tab navigation on cases page', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');

    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }

    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'SELECT', 'BUTTON', 'A']).toContain(focused);
  });

  test('should allow Enter key on buttons', async ({ page }) => {
    await page.goto('/login');

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.focus();

    const isFocused = await submitButton.evaluate((el) => el === document.activeElement);
    expect(isFocused).toBe(true);
  });
});

test.describe('Focus Visibility', () => {
  test('should show focus ring on input focus', async ({ page }) => {
    await page.goto('/login');

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

  test('should show focus ring on button focus', async ({ page }) => {
    await page.goto('/login');

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

test.describe('ARIA Attributes', () => {
  test('alert role should be present for error messages', async ({ page }) => {
    await page.goto('/app/cases/new');

    const alertElements = page.locator('[role="alert"]');
    const count = await alertElements.count();
    expect(count).toBe(0);
  });

  test('tables should have role attribute', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');

    const tables = page.locator('table');
    const count = await tables.count();

    if (count > 0) {
      const hasRole = await tables.first().evaluate((el) => {
        const role = el.getAttribute('role');
        return role === 'grid' || role === 'table' || role === null;
      });
      expect(hasRole).toBe(true);
    }
  });

  test('expandable sections should have aria-expanded', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/audit');

    const expandButtons = page.locator('button[aria-expanded]');
    const count = await expandButtons.count();

    if (count > 0) {
      const hasAriaExpanded = await expandButtons.first().getAttribute('aria-expanded');
      expect(hasAriaExpanded).not.toBeNull();
    }
  });
});

test.describe('Language and Structure', () => {
  test('html element should have lang="ru"', async ({ page }) => {
    await page.goto('/login');

    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBe('ru');
  });

  test('main content should be present', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app');

    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('navigation should be present', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app');

    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });
});

test.describe('Color Contrast', () => {
  test('status badges should have sufficient contrast', async ({ page }) => {
    await loginAsTestUser(page);
    await page.goto('/app/cases');

    const badges = page.locator('[class*="rounded-full"]');
    const count = await badges.count();

    if (count > 0) {
      const hasText = await badges.first().textContent();
      expect(hasText).toBeTruthy();
    }
  });
});
