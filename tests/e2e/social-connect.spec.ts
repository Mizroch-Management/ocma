import { test, expect } from '@playwright/test';

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;
const hasTestCredentials = Boolean(testEmail && testPassword);

const describeWithCreds = hasTestCredentials ? test.describe : test.describe.skip;

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
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

describeWithCreds('Social Media Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('should display connector health dashboard', async ({ page }) => {
    await page.goto('/settings');
    
    // Check for platform connection cards
    await expect(page.locator('text=Twitter')).toBeVisible();
    await expect(page.locator('text=Facebook')).toBeVisible();
    await expect(page.locator('text=Instagram')).toBeVisible();
    await expect(page.locator('text=LinkedIn')).toBeVisible();
  });

  test('should initiate Twitter connection', async ({ page }) => {
    await page.goto('/settings');
    
    // Click connect Twitter button
    const connectButton = page.locator('button:has-text("Connect Twitter")');
    await expect(connectButton).toBeVisible();
    
    // Listen for popup
    const popupPromise = page.waitForEvent('popup');
    await connectButton.click();
    
    const popup = await popupPromise;
    expect(popup.url()).toContain('twitter.com');
    await popup.close();
  });

  test('should show connection status', async ({ page }) => {
    await page.goto('/settings');
    
    // Check for connection status indicators
    const statusBadges = page.locator('[data-testid="connection-status"]');
    const count = await statusBadges.count();
    
    for (let i = 0; i < count; i++) {
      const badge = statusBadges.nth(i);
      const text = await badge.textContent();
      expect(['Connected', 'Not Connected', 'Expired']).toContain(text);
    }
  });

  test('should allow test post', async ({ page }) => {
    await page.goto('/settings');
    
    // Find a connected platform
    const testButton = page.locator('button:has-text("Test Post")').first();
    
    if (await testButton.isVisible()) {
      await testButton.click();
      
      // Check for success or error message
      await expect(page.locator('text=/success|failed/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
