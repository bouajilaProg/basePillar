import { test, expect } from '@playwright/test';

/**
 * E2E: Error page
 *
 * WHY: Rendering errors must be caught and a friendly error page shown
 * - Avoids white screens of death
 * - Provides a recovery path back to the home page
 */
test('shows error page when a route throws', async ({ page }) => {
  await page.goto('/debug/error');

  await expect(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible();
});
