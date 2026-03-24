import { Outlet, Navigate } from 'react-router';
import { useAuth } from '@/hooks/useAuth';

/**
 * Dashboard Layout
 *
 * Protected layout that requires authentication.
 * Redirects to login if not authenticated.
 * Uses flat design with borders instead of cards.
 */
export function DashboardLayout() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="font-semibold">BasePillar</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <button
              onClick={logout}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  );
}
