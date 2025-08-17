import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display auth page', async ({ page }) => {
    await page.goto('/auth');
    
    // Check for auth form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Check for error message
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/auth');
    
    // Use test credentials (would be from env in real scenario)
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/dashboard');
    
    // Should redirect to auth
    await page.waitForURL('**/auth**', { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('should handle logout correctly', async ({ page, context }) => {
    // First login
    await page.goto('/auth');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Logout
    await page.click('button[aria-label="Logout"]');
    
    // Should redirect to auth
    await page.waitForURL('**/auth', { timeout: 5000 });
    
    // Try to access dashboard again
    await page.goto('/dashboard');
    await page.waitForURL('**/auth**', { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });
});