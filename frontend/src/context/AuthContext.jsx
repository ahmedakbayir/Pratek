import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, usersApi } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'pratek_auth';
const ORIGINAL_USER_KEY = 'pratek_original_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalUser, setOriginalUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch { /* ignore */ }
    }
    const storedOriginal = localStorage.getItem(ORIGINAL_USER_KEY);
    if (storedOriginal) {
      try {
        const parsed = JSON.parse(storedOriginal);
        setOriginalUser(parsed);
        setIsImpersonating(true);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setUser(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setOriginalUser(null);
    setIsImpersonating(false);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ORIGINAL_USER_KEY);
  }, []);

  const impersonate = useCallback(async (targetUser) => {
    // Save original admin user
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEY));
    localStorage.setItem(ORIGINAL_USER_KEY, JSON.stringify(currentUser));
    setOriginalUser(currentUser);
    setIsImpersonating(true);
    // Load target user's full data via login response format
    const users = await usersApi.getAll();
    const target = users.find(u => u.id === targetUser.id);
    if (target) {
      setUser(target);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(target));
    }
  }, []);

  const stopImpersonating = useCallback(() => {
    const original = JSON.parse(localStorage.getItem(ORIGINAL_USER_KEY));
    if (original) {
      setUser(original);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(original));
    }
    setOriginalUser(null);
    setIsImpersonating(false);
    localStorage.removeItem(ORIGINAL_USER_KEY);
  }, []);

  const isAdmin = !!(user?.isAdmin) || !!(user?.privilege?.isAdmin);
  const authorizedFirmIds = user?.authorizedFirmIds || [];

  const value = {
    user,
    loading,
    isAdmin: isImpersonating ? false : isAdmin,
    realIsAdmin: isAdmin,
    authorizedFirmIds,
    isImpersonating,
    originalUser,
    login,
    logout,
    impersonate,
    stopImpersonating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
