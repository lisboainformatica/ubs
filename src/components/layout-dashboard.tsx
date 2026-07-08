'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from './theme-provider';
import { logoutAction } from '@/actions/auth.actions';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Stethoscope,
  Pill,
  ShieldAlert,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Sun,
  Moon,
  Search,
  User as UserIcon,
  Settings,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['Administrador', 'Recepcionista', 'Médico', 'Farmácia', 'Gestor Municipal'] },
  { name: 'Pacientes', href: '/pacientes', icon: Users, roles: ['Administrador', 'Recepcionista', 'Médico'] },
  { name: 'Agenda Médica', href: '/agenda', icon: Calendar, roles: ['Administrador', 'Recepcionista', 'Médico'] },
  { name: 'Atendimento', href: '/atendimento', icon: Stethoscope, roles: ['Administrador', 'Médico'] },
  { name: 'Farmácia', href: '/farmacia', icon: Pill, roles: ['Administrador', 'Farmácia'] },
  { name: 'Auditoria LGPD', href: '/auditoria', icon: ShieldAlert, roles: ['Administrador'] },
  { name: 'Administração', href: '/admin', icon: Settings, roles: ['Administrador'] },
];

export default function LayoutDashboardComponent({
  children,
  user,
  municipality,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string } | null;
  municipality: { name: string; primaryColor: string; secondaryColor: string } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; content: string }[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Filter sidebar items by user role
  const userRole = user?.role || '';
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole));

  // Breadcrumbs resolver
  const getBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ name: 'Início', href: '/dashboard' }];
    return parts.map((part, index) => {
      const href = '/' + parts.slice(0, index + 1).join('/');
      const name = part.charAt(0).toUpperCase() + part.slice(1);
      return { name, href };
    });
  };

  const handleLogout = async () => {
    const res = await logoutAction();
    if (res.success) {
      window.location.href = '/login';
    }
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground transition-colors duration-200">
      
      {/* 1. Sidebar for Desktop */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 relative ${
          isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!isSidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-primary tracking-wide">
                {municipality?.name.split(' ')[2] || 'PSF'} Digital
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {user?.role}
              </span>
            </div>
          )}
          {isSidebarCollapsed && (
            <span className="font-black text-xl text-primary mx-auto">PSF</span>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {filteredItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <a
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-blue-500/10'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
                title={item.name}
              >
                <Icon size={20} className="shrink-0" />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          {!isSidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {user?.name.charAt(0)}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold truncate">{user?.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive cursor-pointer transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive cursor-pointer transition-colors mx-auto"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* 2. Mobile Menu / Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex flex-col w-64 bg-card border-r border-border z-10 animate-in slide-in-from-left duration-200">
            <div className="h-16 flex items-center justify-between px-4 border-b border-border">
              <div className="flex flex-col">
                <span className="font-bold text-lg text-primary">{municipality?.name || 'PSF Digital'}</span>
                <span className="text-xs text-muted-foreground">{user?.role}</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <nav className="flex-grow py-4 px-3 space-y-1">
              {filteredItems.map(item => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </nav>
            <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 max-w-[150px] truncate">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {user?.name.charAt(0)}
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-xs font-semibold truncate">{user?.name}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive"
              >
                <LogOut size={18} />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header / Top navbar */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4">
          
          {/* Mobile toggle & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumbs for desktop */}
            <nav className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground">
              <a href="/dashboard" className="hover:text-foreground font-medium transition-colors">UBS</a>
              {getBreadcrumbs().map((b, i) => (
                <React.Fragment key={b.href}>
                  <span>/</span>
                  <a
                    href={b.href}
                    className={`transition-colors hover:text-foreground ${
                      i === getBreadcrumbs().length - 1 ? 'text-foreground font-semibold' : ''
                    }`}
                  >
                    {b.name === 'Dashboard' ? 'Início' : b.name}
                  </a>
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Action bar (Search, Notifications, Theme, User) */}
          <div className="flex items-center gap-3">
            
            {/* Custom Search bar */}
            <div className="hidden lg:flex items-center gap-2 relative">
              <Search className="absolute left-3 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Pesquisa rápida..."
                className="h-9 w-60 rounded-lg border border-border bg-background pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-ring transition-all focus:w-72"
              />
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={theme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors relative"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-2xl p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                    <span className="font-semibold text-sm">Notificações</span>
                    {notifications.length > 0 && (
                      <button 
                        onClick={() => setNotifications([])}
                        className="text-xs text-primary hover:underline"
                      >
                        Limpar todas
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-6 text-xs text-muted-foreground">
                        Nenhuma notificação recente.
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="text-xs p-2 rounded-lg bg-muted border border-border">
                          <p className="font-bold text-foreground mb-0.5">{n.title}</p>
                          <p className="text-muted-foreground">{n.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 border-l border-border pl-3 hover:opacity-80 transition-opacity cursor-pointer text-left focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs select-none shadow-sm shadow-blue-500/10">
                  {user?.name.charAt(0)}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-semibold text-foreground leading-none">{user?.name}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{user?.role}</span>
                </div>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-card shadow-2xl p-2 animate-in fade-in-0 slide-in-from-top-2 duration-200 z-50">
                  <div className="px-3 py-2 border-b border-border mb-1.5 flex flex-col select-none">
                    <span className="text-xs font-bold text-foreground">{user?.name}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 truncate">{user?.email}</span>
                    <span className="text-[9px] uppercase font-extrabold tracking-wider text-primary mt-1.5">{user?.role}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                  >
                    <UserIcon size={14} className="text-muted-foreground" />
                    Mudar de Usuário
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <LogOut size={14} className="text-destructive" />
                    Sair / Logoff
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Main Body view */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}
