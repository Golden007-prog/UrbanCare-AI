import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ──────────────────────────────────────────────────────────
// Credential Context — Manages API credential lifecycle
// ──────────────────────────────────────────────────────────

interface CredentialContextType {
  credentialsReady: boolean;
  loading: boolean;
  error: string | null;
  setCredentials: (hfToken: string, geminiKey: string) => Promise<void>;
  clearCredentials: () => void;
  checkCredentials: () => Promise<void>;
}

const CredentialContext = createContext<CredentialContextType | null>(null);

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

export function CredentialProvider({ children }: { children: React.ReactNode }) {
  const [credentialsReady, setCredentialsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if credentials are already stored in the current session
  const checkCredentials = useCallback(async () => {
    // First check sessionStorage flag
    const flag = sessionStorage.getItem('urbancare_credentials_set');
    if (!flag) {
      setCredentialsReady(false);
      setLoading(false);
      return;
    }

    // Verify with backend that credentials are still valid
    try {
      const res = await fetch(`${API_URL}/api/credentials/status`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setCredentialsReady(data.hasCredentials === true);
        if (!data.hasCredentials) {
          sessionStorage.removeItem('urbancare_credentials_set');
        }
      } else {
        setCredentialsReady(false);
        sessionStorage.removeItem('urbancare_credentials_set');
      }
    } catch {
      // If backend is unreachable, trust the sessionStorage flag
      // This allows the gate to pass in offline/demo scenarios
      setCredentialsReady(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkCredentials();
  }, [checkCredentials]);

  // Send credentials to backend and store session flag
  const setCredentials = async (hfToken: string, geminiKey: string) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/set-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ hfToken, geminiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to store credentials');
      }

      sessionStorage.setItem('urbancare_credentials_set', 'true');
      setCredentialsReady(true);
    } catch (err: any) {
      setError(err.message || 'Failed to set credentials');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clear credentials from backend and session
  const clearCredentials = () => {
    sessionStorage.removeItem('urbancare_credentials_set');
    setCredentialsReady(false);

    // Fire-and-forget to backend
    fetch(`${API_URL}/api/credentials`, {
      method: 'DELETE',
      credentials: 'include',
    }).catch(() => {});
  };

  return (
    <CredentialContext.Provider
      value={{ credentialsReady, loading, error, setCredentials, clearCredentials, checkCredentials }}
    >
      {children}
    </CredentialContext.Provider>
  );
}

export function useCredentials() {
  const ctx = useContext(CredentialContext);
  if (!ctx) throw new Error('useCredentials must be used inside <CredentialProvider>');
  return ctx;
}
