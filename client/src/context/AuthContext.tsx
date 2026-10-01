import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, clearAuthToken } from '../api/client.js';

interface User {
  id: string;
  email: string;
  name: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api
        .getMe()
        .then((res: any) => setUser(res.user))
        .catch(() => {
          clearAuthToken();
          // Fallback to guest automatically if token invalid
          setUser({ id: 'guest-1', email: 'guest@lumina.local', name: 'Guest Scholar', isGuest: true });
        })
        .finally(() => setIsLoading(false));
    } else {
      // Default to guest scholar session so users can immediately demo and explore
      setUser({ id: 'guest-1', email: 'guest@lumina.local', name: 'Guest Scholar', isGuest: true });
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, pass: string) => {
    const res: any = await api.login({ email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const register = async (name: string, email: string, pass: string) => {
    const res: any = await api.register({ name, email, password: pass });
    setAuthToken(res.token);
    setUser(res.user);
  };

  const continueAsGuest = async () => {
    const res: any = await api.guest();
    setAuthToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    clearAuthToken();
    setUser({ id: 'guest-1', email: 'guest@lumina.local', name: 'Guest Scholar', isGuest: true });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, continueAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
