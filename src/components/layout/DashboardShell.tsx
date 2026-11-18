import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  UserCheck,
  UserCircle,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function DashboardShell({
  title,
  breadcrumb,
  primaryAction,
  children,
}: {
  title: string;
  breadcrumb: string;
  primaryAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, company, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navItems: NavItem[] =
    user.role === 'ADMIN'
      ? [
          { label: 'Overview', to: '/admin', icon: LayoutDashboard },
          { label: 'Companies & CV', to: '/admin/companies', icon: Building2 },
          { label: 'Agent Accounts', to: '/admin/agents', icon: UserCheck },
          { label: 'Staff Accounts', to: '/admin/employees', icon: Users },
          { label: 'Worker Directory', to: '/employee/workers', icon: ClipboardList },
          { label: 'Activity Logs', to: '/admin/logs', icon: ClipboardList },
          { label: 'My Profile', to: '/profile', icon: UserCircle },
        ]
      : user.role === 'EMPLOYEE'
        ? [
            { label: 'Overview', to: '/employee', icon: LayoutDashboard },
            { label: 'Worker Directory', to: '/employee/workers', icon: Users },
            { label: 'Register Worker', to: '/employee/workers/new', icon: UserPlus },
            { label: 'My Profile', to: '/profile', icon: UserCircle },
          ]
        : [
            { label: 'Overview', to: '/agent', icon: LayoutDashboard },
            { label: 'Candidate Catalog', to: '/agent/candidates', icon: Users },
            { label: 'My Customers', to: '/agent/customers', icon: MessageCircle },
            { label: 'My Profile', to: '/profile', icon: UserCircle },
          ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel =
    user.role === 'ADMIN'
      ? 'Administrator'
      : user.role === 'EMPLOYEE'
        ? 'Dhaka Staff'
        : company?.nameEn || 'International Agent';

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-slate-900 text-slate-100">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <Link
            to={user.role === 'ADMIN' ? '/admin' : user.role === 'EMPLOYEE' ? '/employee' : '/agent'}
            className="font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Maktab Placement
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="rounded p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Primary Sidebar" className="space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.to !== '/admin' &&
                item.to !== '/employee' &&
                item.to !== '/agent' &&
                location.pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4">
        <Link
          to="/profile"
          onClick={() => setMobileMenuOpen(false)}
          className="mb-3 block rounded-lg p-1.5 transition-colors hover:bg-slate-800"
        >
          <p className="truncate text-sm font-medium text-white">{user.fullName}</p>
          <p className="truncate text-xs text-slate-400">{roleLabel}</p>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white whitespace-nowrap"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-64 max-w-[80vw]">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3.5 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">{breadcrumb}</p>
              <h1 className="truncate font-display text-lg font-semibold text-slate-900">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {primaryAction}
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
