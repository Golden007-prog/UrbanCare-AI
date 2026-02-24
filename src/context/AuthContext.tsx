import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  specialty: string;
  googleId: string | null;
  role: 'doctor' | 'patient' | 'family' | 'admin' | 'lab' | 'laboratory' | 'pharmacist' | 'super_admin' | 'hospital_admin' | 'pending';
  hospitalID: string;
  linkedPatientIDs: string[];
}

export interface PendingGoogleUser {
  googleId: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  pendingGoogleUser: PendingGoogleUser | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  demoLogin: (role: string) => Promise<void>;
  register: (payload: any) => Promise<AuthUser>;
  googleLogin: () => void;
  completeGoogleSignup: (data: { googleId: string; email: string; name: string; role: string }) => Promise<void>;
  clearPendingGoogle: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ──────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<PendingGoogleUser | null>(null);

  // On mount — check if we already have a valid session cookie
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Server unreachable — stay logged out
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // Check for Google OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('auth') === 'success') {
      // Existing user — session cookie is set, fetch user
      window.history.replaceState({}, '', window.location.pathname);
      fetchMe();
    } else if (params.get('auth') === 'google-pending') {
      // New Google user — needs role selection
      setPendingGoogleUser({
        googleId: params.get('googleId') || '',
        email: params.get('email') || '',
        name: params.get('name') || '',
      });
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
    }
  }, [fetchMe]);

  const login = async (email: string, password: string, _remember?: boolean) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      setUser(data.user);
    } catch (err: any) {
      // Demo mode fallback — allows testing without backend auth
      if ((window as any).__DEMO_AUTH__) {
        setUser({
          id: 'demo-001',
          name: 'Dr. Demo Physician',
          email: 'demo@urbancare.com',
          specialty: 'General Medicine',
          googleId: null,
          role: 'doctor',
          hospitalID: 'H001',
          linkedPatientIDs: [],
        });
        return;
      }
      throw err;
    }
  };

  const googleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const demoLogin = async (role: string) => {
    const res = await fetch(`${API_URL}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Demo login failed');
    setUser(data.user);
  };

  const completeGoogleSignup = async (payload: { googleId: string; email: string; name: string; role: string }) => {
    const res = await fetch(`${API_URL}/auth/complete-google-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google signup failed');
    setUser(data.user);
    setPendingGoogleUser(null);
  };

  const clearPendingGoogle = () => setPendingGoogleUser(null);

  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Even if the request fails, clear local state
    }
    setUser(null);
  };

  const register = async (payload: any): Promise<AuthUser> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed');
    }
    // Set user from the response so auth state is immediately available
    const newUser = data.user as AuthUser;
    setUser(newUser);
    return newUser;
  };

  return (
    <AuthContext.Provider value={{ user, loading, pendingGoogleUser, login, demoLogin, register, googleLogin, completeGoogleSignup, clearPendingGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
