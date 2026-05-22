'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AppOption {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  apps: AppOption[];
  selectedApp: AppOption | null;
  isLoading: boolean;
  login: (token: string, user: User, apps: AppOption[]) => void;
  logout: () => void;
  setAppsList: (apps: AppOption[]) => void;
  selectApp: (app: AppOption) => void;
  refreshApps: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apps, setApps] = useState<AppOption[]>([]);
  const [selectedApp, setSelectedApp] = useState<AppOption | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load auth from localStorage on mount
    const storedToken = localStorage.getItem('acg_token');
    const storedUser = localStorage.getItem('acg_user');
    const storedApps = localStorage.getItem('acg_apps');
    const storedSelectedApp = localStorage.getItem('acg_selected_app');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      if (storedApps) {
        const parsedApps = JSON.parse(storedApps) as AppOption[];
        setApps(parsedApps);
        
        if (storedSelectedApp) {
          setSelectedApp(JSON.parse(storedSelectedApp));
        } else if (parsedApps.length > 0) {
          setSelectedApp(parsedApps[0]);
          localStorage.setItem('acg_selected_app', JSON.stringify(parsedApps[0]));
        }
      }
    } else {
      // If no session and trying to access protected route, redirect
      if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
        router.replace('/login');
      }
    }
    setIsLoading(false);
  }, [pathname, router]);

  const login = (newToken: string, newUser: User, newApps: AppOption[]) => {
    setToken(newToken);
    setUser(newUser);
    setApps(newApps);

    localStorage.setItem('acg_token', newToken);
    localStorage.setItem('acg_user', JSON.stringify(newUser));
    localStorage.setItem('acg_apps', JSON.stringify(newApps));

    if (newApps.length > 0) {
      setSelectedApp(newApps[0]);
      localStorage.setItem('acg_selected_app', JSON.stringify(newApps[0]));
    } else {
      setSelectedApp(null);
      localStorage.removeItem('acg_selected_app');
    }

    router.push('/dashboard');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setApps([]);
    setSelectedApp(null);

    localStorage.removeItem('acg_token');
    localStorage.removeItem('acg_user');
    localStorage.removeItem('acg_apps');
    localStorage.removeItem('acg_selected_app');

    router.replace('/login');
  };

  const setAppsList = (newApps: AppOption[]) => {
    setApps(newApps);
    localStorage.setItem('acg_apps', JSON.stringify(newApps));
    
    // If current selected app is no longer in the list, choose another
    if (selectedApp && !newApps.some((a) => a.id === selectedApp.id)) {
      if (newApps.length > 0) {
        setSelectedApp(newApps[0]);
        localStorage.setItem('acg_selected_app', JSON.stringify(newApps[0]));
      } else {
        setSelectedApp(null);
        localStorage.removeItem('acg_selected_app');
      }
    } else if (!selectedApp && newApps.length > 0) {
      setSelectedApp(newApps[0]);
      localStorage.setItem('acg_selected_app', JSON.stringify(newApps[0]));
    }
  };

  const selectApp = (app: AppOption) => {
    setSelectedApp(app);
    localStorage.setItem('acg_selected_app', JSON.stringify(app));
  };

  const refreshApps = async () => {
    try {
      const { apiClient } = await import('../api/client');
      const response = await apiClient.get('/api/apps');
      if (response.data?.success) {
        const appList = response.data.apps.map((a: any) => ({ id: a.id, name: a.name }));
        setAppsList(appList);
      }
    } catch (e) {
      console.error('Failed to refresh apps list', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        apps,
        selectedApp,
        isLoading,
        login,
        logout,
        setAppsList,
        selectApp,
        refreshApps,
      }}
    >
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
