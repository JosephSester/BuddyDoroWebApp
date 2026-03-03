import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/authApi';
import type { AuthUser } from '../api/authApi';

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authApi.me();
      setUser(freshUser);
    } catch {
      logout();
    }
  }, [logout]);

  const updateUser = useCallback((partial: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...partial } : prev);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi.me()
      .then(setUser)
      .catch(logout)
      .finally(() => setIsLoading(false));
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, refreshUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
