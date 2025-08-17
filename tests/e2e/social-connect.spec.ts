import { test, expect } from '@playwright/test';

test.describe('Social Media Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
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