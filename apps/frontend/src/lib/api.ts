/**
 * API Client
 *
 * Handles all API requests with consistent error handling.
 * Uses fetch with credentials for cookie-based auth.
 */

const API_BASE = '/api';

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(
      data.code || 'UNKNOWN_ERROR',
      data.message || 'An error occurred',
      response.status
    );
  }

  return data;
}

/**
 * Auth API endpoints
 */
export const api = {
  /**
   * Register a new user
   */
  register: (data: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
  }) =>
    fetchApi<{
      user: { id: string; email: string; name: string };
      organization: { id: string; name: string; slug: string };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Login user
   */
  login: (data: { email: string; password: string }) =>
    fetchApi<{
      user: { id: string; email: string; name: string };
      organizations: Array<{ id: string; name: string; slug: string; role: 'admin' | 'member' }>;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Logout user
   */
  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  /**
   * Get current user
   */
  me: () =>
    fetchApi<{
      id: string;
      email: string;
      name: string | null;
      organizations: Array<{ id: string; name: string; slug: string; role: 'admin' | 'member' }>;
    }>('/auth/me'),
};
