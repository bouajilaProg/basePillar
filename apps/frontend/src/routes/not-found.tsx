import { Link } from 'react-router';
import { Button } from '@repo/ui';

/**
 * Not Found Page (404)
 *
 * Flat UI design with a clear recovery path.
 */
export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">404</p>
          <h1 className="text-3xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground">
            The page you are looking for does not exist.
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
