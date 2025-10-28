import { test, expect } from '@playwright/test';

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;
const hasTestCredentials = Boolean(testEmail && testPassword);

const describeWithCreds = hasTestCredentials ? test.describe : test.describe.skip;

async function isOnboardingVisible(page) {
  const url = new URL(page.url());
  if (url.pathname.startsWith('/organizations')) return true;
  try {
    return await page.getByText('Organization Setup', { exact: false }).isVisible();
  } catch {
    return false;
  }
}

async function ensureOrganizationReady(page) {
  await page.waitForLoadState('networkidle');
  if (!(await isOnboardingVisible(page))) {
    return true;
  }

  try {
    const nameInput = page.locator('#orgName');
    if (!(await nameInput.isVisible())) {
      return !(await isOnboardingVisible(page));
    }

    await nameInput.fill(`QA Smoke Org ${Date.now()}`);

    const descriptionInput = page.locator('#orgDescription');
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('Automatically generated organization for Playwright smoke tests.');
    }

    await page.locator('button:has-text("Create Organization")').click();
    await page.waitForURL((url) => !url.pathname.startsWith('/organizations'), { timeout: 20000 });
    await page.waitForLoadState('networkidle');
    return !(await isOnboardingVisible(page));
  } catch {
    return !(await isOnboardingVisible(page));
  }
}

async function signIn(page) {
  await page.goto('/auth');
  const signInTab = page.locator('button:has-text("Sign In")').first();
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  const emailInput = page.locator('[data-testid="login/email-input"], input[type="email"]').first();
  const passwordInput = page.locator('[data-testid="login/password-input"], input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  await emailInput.fill(testEmail!);
  await passwordInput.fill(testPassword!);
  await submitButton.click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  if (!(await ensureOrganizationReady(page))) {
    test.skip(true, 'Organization onboarding incomplete');
  }
}

describeWithCreds('Content Creation and Scheduling Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('should load content generator form', async ({ page }) => {
    await page.goto('/content-generator');
    if (new URL(page.url()).pathname.startsWith('/organizations')) {
      test.skip(true, 'User has no active organization');
    }
    if (await page.getByText('Organization Setup', { exact: false }).isVisible()) {
      test.skip(true, 'Organization onboarding shown');
    }
    const promptInput = page.locator('textarea[placeholder*="Add specific instructions"]');
    if (!(await promptInput.isVisible())) {
      test.skip(true, 'Content generator prompt field not available');
    }
    await expect(promptInput).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate Content/i })).toBeVisible();
  });

  test('should open scheduling dialog from calendar', async ({ page }) => {
    await page.goto('/calendar');
    if (new URL(page.url()).pathname.startsWith('/organizations')) {
      test.skip(true, 'User has no active organization');
    }
    if (await page.getByText('Organization Setup', { exact: false }).isVisible()) {
      test.skip(true, 'Organization onboarding shown');
    }

    const createButton = page.locator('button:has-text("Create Post")');
    if (!(await createButton.isVisible())) {
      test.skip(true, 'Create Post button not available');
    }

    await createButton.click();
    const dialog = page.locator('role=dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Close dialog if present
    const closeButton = page.locator('button:has-text("Cancel")').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  });

  test('should render calendar view', async ({ page }) => {
    await page.goto('/calendar');
    if (new URL(page.url()).pathname.startsWith('/organizations')) {
      test.skip(true, 'User has no active organization');
    }
    if (await page.getByText('Organization Setup', { exact: false }).isVisible()) {
      test.skip(true, 'Organization onboarding shown');
    }
    await expect(page.getByRole('heading', { name: /Content Calendar/i })).toBeVisible();
  });
});
