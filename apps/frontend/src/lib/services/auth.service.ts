import type { User } from '../drive-types';
import { fetchApi } from './fetchApi';

export const auth = {
  register: (payload: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
  }) =>
    fetchApi<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    fetchApi<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: () => fetchApi<User>('/auth/me'),
};
