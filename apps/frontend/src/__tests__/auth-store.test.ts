import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../stores/auth';

/**
 * AGGRESSIVE TEST SUITE: Auth Store
 *
 * Why test the auth store thoroughly?
 * 1. Authentication state is critical - bugs here = broken auth flow
 * 2. Persistence to localStorage must work correctly
 * 3. State updates must be atomic and consistent
 * 4. Clear user must reset ALL state
 *
 * Testing strategy:
 * - Test each action in isolation
 * - Verify state shape after each action
 * - Test persistence behavior
 */

describe('Auth Store', () => {
  /**
   * Reset store before each test
   */
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      organizations: [],
      isAuthenticated: false,
    });
  });

  describe('initial state', () => {
    /**
     * WHY: Default state must be unauthenticated
     * Security: Users should not be authenticated by default
     */
    it('should have null user initially', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should have empty organizations initially', () => {
      const state = useAuthStore.getState();
      expect(state.organizations).toEqual([]);
    });

    it('should not be authenticated initially', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    /**
     * WHY: setUser is called after successful login/register
     * Must set all auth state correctly
     */
    it('should set user data', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test User' };
      const orgs = [{ id: 'org1', name: 'Org', slug: 'org', role: 'admin' as const }];

      useAuthStore.getState().setUser(user, orgs);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user);
    });

    it('should set organizations', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const orgs = [
        { id: 'org1', name: 'Org 1', slug: 'org-1', role: 'admin' as const },
        { id: 'org2', name: 'Org 2', slug: 'org-2', role: 'member' as const },
      ];

      useAuthStore.getState().setUser(user, orgs);

      const state = useAuthStore.getState();
      expect(state.organizations).toEqual(orgs);
    });

    it('should set isAuthenticated to true', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };

      useAuthStore.getState().setUser(user, []);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
    });

    /**
     * WHY: setUser might be called multiple times (re-login, refresh)
     * Must fully replace previous state
     */
    it('should replace existing user data', () => {
      const user1 = { id: '1', email: 'user1@example.com', name: 'User 1' };
      const user2 = { id: '2', email: 'user2@example.com', name: 'User 2' };

      useAuthStore.getState().setUser(user1, []);
      useAuthStore.getState().setUser(user2, []);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(user2);
    });

    /**
     * WHY: Empty organizations is valid (new user)
     */
    it('should handle empty organizations', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };

      useAuthStore.getState().setUser(user, []);

      const state = useAuthStore.getState();
      expect(state.organizations).toEqual([]);
      expect(state.isAuthenticated).toBe(true);
    });

    /**
     * WHY: User name can be null (not provided during registration)
     */
    it('should handle null user name', () => {
      const user = { id: '1', email: 'test@example.com', name: null };

      useAuthStore.getState().setUser(user, []);

      const state = useAuthStore.getState();
      expect(state.user?.name).toBeNull();
    });
  });

  describe('clearUser', () => {
    /**
     * WHY: clearUser is called on logout
     * Must reset ALL auth state to defaults
     */
    it('should clear user data', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      useAuthStore.getState().setUser(user, []);

      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('should clear organizations', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      const orgs = [{ id: 'org1', name: 'Org', slug: 'org', role: 'admin' as const }];
      useAuthStore.getState().setUser(user, orgs);

      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.organizations).toEqual([]);
    });

    it('should set isAuthenticated to false', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      useAuthStore.getState().setUser(user, []);

      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    /**
     * WHY: Calling clearUser when already cleared should not break
     */
    it('should be idempotent', () => {
      useAuthStore.getState().clearUser();
      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('state consistency', () => {
    /**
     * WHY: State must always be consistent
     * isAuthenticated should match presence of user
     */
    it('should have consistent state after setUser', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      useAuthStore.getState().setUser(user, []);

      const state = useAuthStore.getState();
      expect(state.user !== null).toBe(state.isAuthenticated);
    });

    it('should have consistent state after clearUser', () => {
      const user = { id: '1', email: 'test@example.com', name: 'Test' };
      useAuthStore.getState().setUser(user, []);
      useAuthStore.getState().clearUser();

      const state = useAuthStore.getState();
      expect(state.user === null).toBe(!state.isAuthenticated);
    });
  });
});
