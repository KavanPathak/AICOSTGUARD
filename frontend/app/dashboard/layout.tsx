'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  BarChart3,
  ListTodo,
  KeyRound,
  BellRing,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Loader2,
  FolderKanban,
  ChevronDown
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, apps, selectedApp, selectApp, logout, isLoading, refreshApps } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (user) {
      refreshApps();
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center min-h-screen bg-slate-950">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <span className="mt-4 text-sm text-muted-foreground">Initializing session...</span>
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Request Logs', href: '/dashboard/logs', icon: ListTodo },
    { name: 'API Keys', href: '/dashboard/keys', icon: KeyRound },
    { name: 'Alerts', href: '/dashboard/alerts', icon: BellRing },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-slate-900 border-r border-border/80">
        <div className="h-16 flex items-center px-6 gap-2 border-b border-border/85">
          <ShieldAlert className="h-6 w-6 text-indigo-500" />
          <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AICostGuard
          </span>
        </div>

        {/* App Switcher */}
        <div className="px-4 py-4 border-b border-border/60">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Active Application
          </label>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-slate-950/60 border border-input rounded-md hover:bg-slate-950 transition-all text-left"
            >
              <span className="flex items-center gap-2 truncate">
                <FolderKanban className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span className="truncate">{selectedApp?.name || 'No Apps Selected'}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>

            {dropdownOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md shadow-lg bg-slate-900 border border-input py-1 text-base max-h-60 overflow-auto focus:outline-none sm:text-sm">
                {apps.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      selectApp(app);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-indigo-600/20 hover:text-indigo-200 transition-colors text-sm truncate flex items-center gap-2 ${
                      selectedApp?.id === app.id ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-foreground/80'
                    }`}
                  >
                    {app.name}
                  </button>
                ))}
                {apps.length === 0 && (
                  <div className="px-4 py-2 text-xs text-muted-foreground">No apps configured. Create one in Settings.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-grow px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                    : 'text-muted-foreground hover:bg-slate-800/60 hover:text-foreground'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User profile / Logout */}
        <div className="p-4 border-t border-border/80 bg-slate-900/60">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-sm font-semibold truncate text-foreground/90">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-md border border-input/60 hover:bg-slate-800 text-muted-foreground hover:text-destructive transition-all"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main layout container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-border/80 md:hidden flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-500" />
            <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AICostGuard
            </span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Mobile Sidebar Modal */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden bg-slate-950/80 backdrop-blur-sm">
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 border-r border-border">
              <div className="absolute top-0 right-0 -mr-12 pt-4">
                <button
                  onClick={() => setMobileOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <X className="h-6 w-6 text-white" />
                </button>
              </div>

              <div className="h-16 flex items-center px-6 gap-2 border-b border-border">
                <ShieldAlert className="h-6 w-6 text-indigo-500" />
                <span className="font-extrabold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  AICostGuard
                </span>
              </div>

              {/* App Switcher - Mobile */}
              <div className="px-4 py-4 border-b border-border">
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Active Application
                </label>
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm bg-slate-950/60 border border-input rounded-md"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FolderKanban className="h-4 w-4 text-indigo-400" />
                      <span className="truncate">{selectedApp?.name || 'No Apps Selected'}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md shadow-lg bg-slate-900 border border-input py-1 text-base max-h-60 overflow-auto">
                      {apps.map((app) => (
                        <button
                          key={app.id}
                          onClick={() => {
                            selectApp(app);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-slate-800 text-sm truncate flex items-center gap-2 ${
                            selectedApp?.id === app.id ? 'bg-indigo-600/10 text-indigo-400 font-semibold' : 'text-foreground/80'
                          }`}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Navigation links - Mobile */}
              <nav className="flex-grow px-4 py-6 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                          : 'text-muted-foreground hover:bg-slate-800/60 hover:text-foreground'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* User profile / Logout - Mobile */}
              <div className="p-4 border-t border-border bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <div className="truncate pr-2">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 rounded-md border border-input hover:bg-slate-800 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto bg-slate-950 p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
