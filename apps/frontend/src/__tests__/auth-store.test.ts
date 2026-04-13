import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../stores/auth';

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('sets user and authenticated state', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'user@example.com', name: 'User' });

    const state = useAuthStore.getState();
    expect(state.user?.email).toBe('user@example.com');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears auth state on logout', () => {
    useAuthStore.getState().setUser({ id: 'u1', email: 'user@example.com', name: 'User' });
    useAuthStore.getState().clearUser();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
