import { useAuthStore } from '@/stores/auth';

/**
 * Dashboard Page
 *
 * Main dashboard showing user organizations.
 * Uses flat design with divide-y for list items.
 */
export function DashboardPage() {
  const { user, organizations } = useAuthStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome, {user?.name || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here's an overview of your organizations
        </p>
      </div>

      <div className="border-t pt-6">
        <h2 className="mb-4 text-lg font-medium">Your Organizations</h2>

        {organizations.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              You don't belong to any organizations yet.
            </p>
          </div>
        ) : (
          <div className="divide-y border-y">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="flex items-center justify-between py-4"
              >
                <div>
                  <div className="font-medium">{org.name}</div>
                  <div className="text-sm text-muted-foreground">
                    /{org.slug}
                  </div>
                </div>
                <div className="text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      org.role === 'admin'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {org.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
