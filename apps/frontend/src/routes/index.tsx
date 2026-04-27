import { Link } from 'react-router';
import { Button } from '@repo/ui';

/**
 * Home Page
 *
 * Landing page with links to auth and dashboard.
 * Minimal design following flat UI principles.
 */
export function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">BasePillar Drive</h1>
          <p className="text-muted-foreground">
            White mode file workspace with a Google-style flow
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link to="/drive">Open Drive</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/auth/register">Create Account</Link>
          </Button>
        </div>

        <div className="border-t pt-8">
          <p className="text-sm text-muted-foreground">
            Built with TypeScript, Tailwind CSS, and Shadcn UI
          </p>
        </div>
      </div>
    </div>
  );
}
