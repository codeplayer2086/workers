import React, { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiFetch, setAuthToken } from '../lib/api';
import type { Company, CompanyCvTemplate, PortalUser } from '../types/portal';

interface AuthSessionResponse {
  token?: string;
  user: PortalUser;
  company: Company | null;
  template: CompanyCvTemplate | null;
}

interface AuthContextValue {
  user: PortalUser | null;
  company: Company | null;
  template: CompanyCvTemplate | null;
  loading: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<PortalUser>;
  loginWithGoogle: () => Promise<PortalUser>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [template, setTemplate] = useState<CompanyCvTemplate | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const data = await apiFetch<AuthSessionResponse>('/api/auth/me');
      setUser(data.user);
      setCompany(data.company);
      setTemplate(data.template);
    } catch {
      setUser(null);
      setCompany(null);
      setTemplate(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const loginWithCredentials = async (email: string, password: string): Promise<PortalUser> => {
    const data = await apiFetch<AuthSessionResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    setUser(data.user);
    setCompany(data.company);
    setTemplate(data.template);
    return data.user;
  };

  const loginWithGoogle = async (): Promise<PortalUser> => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    setAuthToken(idToken);
    const data = await apiFetch<AuthSessionResponse>('/api/auth/firebase', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    setUser(data.user);
    setCompany(data.company);
    setTemplate(data.template);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    try {
      await signOut(auth);
    } catch {
      // ignore if not signed in with Firebase
    }
    setAuthToken(null);
    setUser(null);
    setCompany(null);
    setTemplate(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        template,
        loading,
        loginWithCredentials,
        loginWithGoogle,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
