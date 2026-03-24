import { test, expect } from '@playwright/test';

/**
 * E2E: Not Found page
 *
 * WHY: Unknown routes must render a 404 page
 * - Prevents blank screens
 * - Provides a recovery path back to the home page
 */
test('shows 404 page for unknown routes', async ({ page }) => {
  await page.goto('/definitely-not-a-real-route');

  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
});
