/**
 * Debug Error Page
 *
 * Intentionally throws to validate ErrorBoundary behavior.
 * Used by Playwright E2E tests.
 */
export function DebugErrorPage(): never {
  throw new Error('Debug error route');
}
