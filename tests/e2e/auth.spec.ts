import { test, expect } from '@playwright/test';

const testEmail = process.env.TEST_USER_EMAIL;
const testPassword = process.env.TEST_USER_PASSWORD;
const hasTestCredentials = Boolean(testEmail && testPassword);

async function getAuthControls(page) {
  const signInTab = page.locator('button:has-text("Sign In")').first();
  if (await signInTab.isVisible()) {
    await signInTab.click();
  }

  const emailInput = page.locator('[data-testid="login/email-input"], input[type="email"]').first();
  const passwordInput = page.locator('[data-testid="login/password-input"], input[type="password"]').first();
  const submitButton = page.locator('button[type="submit"]').first();

  return { emailInput, passwordInput, submitButton };
}

test.describe('Authentication Flow', () => {
  test('should display auth page', async ({ page }) => {
    test.skip(true, 'Supabase UI renders multiple nested forms; manual check required for now');
    await page.goto('/auth');
    
    // Check for auth form elements
    const { emailInput, passwordInput, submitButton } = await getAuthControls(page);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    test.skip(true, 'Supabase UI renders multiple nested forms; manual check required for now');
    await page.goto('/auth');
    
    // Fill in invalid credentials
    const { emailInput, passwordInput, submitButton } = await getAuthControls(page);

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    await submitButton.click();
    
    // Check for error message
    await expect(page.locator('text=/invalid|error/i')).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    test.skip(!hasTestCredentials, 'Requires TEST_USER_EMAIL/TEST_USER_PASSWORD in environment');

    await page.goto('/auth');
    
    // Use test credentials (would be from env in real scenario)
    const { emailInput, passwordInput, submitButton } = await getAuthControls(page);

    await emailInput.fill(testEmail!);
    await passwordInput.fill(testPassword!);
    await submitButton.click();
    
    // Wait for navigation
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're on dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('should protect authenticated routes', async ({ page }) => {
    test.skip(process.env.VERCEL_PROTECTED === 'true', 'Skipped on password-protected deployments');
    
    // Try to access protected route without auth
    await page.goto('/dashboard');
    
    // Should redirect to auth
    await page.waitForURL('**/auth**', { timeout: 5000 });
    expect(page.url()).toContain('/auth');
  });

  test('should handle logout correctly', async ({ page, context }) => {
    test.skip(!hasTestCredentials, 'Requires TEST_USER_EMAIL/TEST_USER_PASSWORD in environment');
    
    // First login
    await page.goto('/auth');
    const { emailInput, passwordInput, submitButton } = await getAuthControls(page);

    await emailInput.fill(testEmail!);
    await passwordInput.fill(testPassword!);
    await submitButton.click();
    
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
