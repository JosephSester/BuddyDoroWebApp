import { apiGet, apiPost, apiPut } from './client';

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  doros: number;
  diamonds: number;
  life: { current: number; max: number };
  settings: { focusMinutes: number; breakMinutes: number; theme?: string };
  hasSeenOnboarding: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<LoginResponse>('/auth/login', { email, password }),

  signup: (name: string, email: string, password: string) =>
    apiPost<LoginResponse>('/auth/signup', { name, email, password }),

  me: () => apiGet<AuthUser>('/auth/me'),

  updateProfile: (name: string) =>
    apiPut<{ user: AuthUser }>('/auth/profile', { name }),

  updateAccount: (data: { email?: string; currentPassword?: string; newPassword?: string }) =>
    apiPut<{ message: string }>('/auth/account', data),
};
