import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore, type User, type Organization } from '@/stores/auth';
import { api } from '@/lib/api';

/**
 * useAuth Hook
 *
 * Provides authentication state and methods.
 * Syncs with server via /api/auth/me on mount.
 *
 * Why use both Zustand and React Query?
 * - Zustand: Immediate UI state (no loading flash on navigation)
 * - React Query: Server state verification (token might be expired)
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, organizations, isAuthenticated, setUser, clearUser } = useAuthStore();

  /**
   * Verify session with server
   * Only runs if we think we're authenticated (have local state)
   */
  const { isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const data = await api.me();
      setUser(
        { id: data.id, email: data.email, name: data.name },
        data.organizations
      );
      return data;
    },
    enabled: isAuthenticated, // Only verify if we have local auth state
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  /**
   * Clear auth state if server says we're not authenticated
   */
  useEffect(() => {
    if (isError && isAuthenticated) {
      clearUser();
    }
  }, [isError, isAuthenticated, clearUser]);

  /**
   * Logout mutation
   */
  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      clearUser();
      queryClient.clear();
      navigate('/auth/login');
    },
  });

  return {
    user,
    organizations,
    isAuthenticated,
    isLoading: isAuthenticated && isLoading,
    logout: () => logoutMutation.mutate(),
  };
}
