import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * User type from API response
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Organization with role
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: 'admin' | 'member';
}

/**
 * Auth Store State
 */
interface AuthState {
  user: User | null;
  organizations: Organization[];
  isAuthenticated: boolean;
  setUser: (user: User, organizations: Organization[]) => void;
  clearUser: () => void;
}

/**
 * Auth Store
 *
 * Manages user authentication state with Zustand.
 * Persists to localStorage for session continuity.
 *
 * Note: JWT is in HttpOnly cookie, so we can't access it directly.
 * We rely on /api/auth/me to verify authentication.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organizations: [],
      isAuthenticated: false,

      setUser: (user, organizations) =>
        set({
          user,
          organizations,
          isAuthenticated: true,
        }),

      clearUser: () =>
        set({
          user: null,
          organizations: [],
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        organizations: state.organizations,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
