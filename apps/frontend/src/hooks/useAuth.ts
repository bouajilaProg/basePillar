import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth';
import { api } from '@/lib/api';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  const { isLoading, isError } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const data = await api.auth.me();
      setUser({ id: data.id, email: data.email, name: data.name });
      return data;
    },
    enabled: true,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (isError && isAuthenticated) {
      clearUser();
    }
  }, [isError, isAuthenticated, clearUser]);

  const logoutMutation = useMutation({
    mutationFn: api.auth.logout,
    onSuccess: () => {
      clearUser();
      queryClient.clear();
      navigate('/auth/login');
    },
  });

  return {
    user,
    isAuthenticated,
    isLoading: isAuthenticated && isLoading,
    logout: () => logoutMutation.mutate(),
  };
}
