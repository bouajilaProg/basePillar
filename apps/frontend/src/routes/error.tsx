import { Link } from 'react-router';
import { Button } from '@repo/ui';

/**
 * Error Page
 *
 * Rendered by the ErrorBoundary when a route throws.
 */
export function ErrorPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Error</p>
          <h1 className="text-3xl font-semibold">Something went wrong</h1>
          <p className="text-muted-foreground">
            Please try again or return to the home page.
          </p>
        </div>
        <div className="flex justify-center">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
