'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'teacher' | 'student';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, display_name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = 'yochat_user';
const TOKEN_KEY = 'yochat_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Восстанавливаем сессию из localStorage при загрузке
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);
    
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    // Сохраняем в localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    setUser(data.user);
  }

  async function register(username: string, display_name: string, password: string) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    // Сохраняем в localStorage
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    setUser(data.user);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
