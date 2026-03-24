import { Outlet } from 'react-router';
import { ErrorBoundary } from '../components/error-boundary';

/**
 * Root Layout
 *
 * Wraps all pages with common providers and styles.
 * Uses h-dvh instead of h-screen for proper mobile viewport handling.
 */
export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  );
}
