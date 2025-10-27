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

describeWithCreds('Content Creation and Scheduling Flow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('should create AI-generated content', async ({ page }) => {
    await page.goto('/content-generator');
    
    // Fill in prompt
    await page.fill('textarea[placeholder*="prompt"]', 'Create a post about productivity tips');
    
    // Select platform
    await page.click('[data-testid="platform-selector"]');
    await page.click('text=Twitter');
    
    // Generate content
    await page.click('button:has-text("Generate")');
    
    // Wait for AI response
    await expect(page.locator('[data-testid="generated-content"]')).toBeVisible({ timeout: 30000 });
    
    // Check for variants
    const variants = page.locator('[data-testid="content-variant"]');
    const count = await variants.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should schedule a post', async ({ page }) => {
    await page.goto('/calendar');
    
    // Click create post button
    await page.click('button:has-text("Create Post")');
    
    // Fill in post details
    await page.fill('textarea[name="content"]', 'Test scheduled post content');
    
    // Select platform
    await page.click('[data-testid="platform-selector"]');
    await page.click('text=Twitter');
    
    // Set schedule date/time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 16);
    await page.fill('input[type="datetime-local"]', dateStr);
    
    // Submit
    await page.click('button:has-text("Schedule")');
    
    // Check for success message
    await expect(page.locator('text=/scheduled|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display scheduled posts in calendar', async ({ page }) => {
    await page.goto('/calendar');
    
    // Check for calendar view
    await expect(page.locator('.calendar')).toBeVisible();
    
    // Check for posts list
    const posts = page.locator('[data-testid="scheduled-post"]');
    const count = await posts.count();
    
    if (count > 0) {
      // Click on first post
      await posts.first().click();
      
      // Check for post details
      await expect(page.locator('[data-testid="post-details"]')).toBeVisible();
    }
  });

  test('should edit scheduled post', async ({ page }) => {
    await page.goto('/calendar');
    
    // Find a scheduled post
    const editButton = page.locator('button[aria-label="Edit post"]').first();
    
    if (await editButton.isVisible()) {
      await editButton.click();
      
      // Edit content
      await page.fill('textarea[name="content"]', 'Updated post content');
      
      // Save changes
      await page.click('button:has-text("Save")');
      
      // Check for success message
      await expect(page.locator('text=/updated|saved/i')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle failed posts with retry', async ({ page }) => {
    await page.goto('/calendar');
    
    // Filter for failed posts
    await page.click('[data-testid="status-filter"]');
    await page.click('text=Failed');
    
    // Find retry button
    const retryButton = page.locator('button[aria-label="Retry post"]').first();
    
    if (await retryButton.isVisible()) {
      await retryButton.click();
      
      // Check for retry confirmation
      await expect(page.locator('text=/retry|rescheduled/i')).toBeVisible({ timeout: 10000 });
    }
  });
});
