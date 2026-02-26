'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useSidebar } from '@/lib/sidebar-context';
import SidebarStoreSelector from './SidebarStoreSelector';
import {
  Package, ClipboardList, Store, Users,
  LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';

const BRAND_ORANGE = '#d96f36';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  if (!user) return null;

  const isAdmin = user.role === 'master_admin' || user.role === 'store_admin';
  const rolePrefix = isAdmin ? '/admin' : '/supplier';

  const navItems: NavItem[] = [
    { label: 'Orders', href: `${rolePrefix}/orders`, icon: ClipboardList },
    { label: 'Products', href: `${rolePrefix}/products`, icon: Package },
    { label: 'Stores', href: '/admin/stores', icon: Store, adminOnly: true },
    { label: 'Users', href: '/admin/users', icon: Users, adminOnly: true },
  ].filter(item => !item.adminOnly || user.role === 'master_admin');

  const isActive = (href: string) => pathname === href;

  const userInitials = user.username
    ? user.username.slice(0, 2).toUpperCase()
    : '??';

  const roleBadge = user.role === 'master_admin'
    ? { label: 'Admin', bg: 'bg-orange-500/20', text: 'text-orange-400' }
    : user.role === 'store_admin'
    ? { label: 'Store Admin', bg: 'bg-blue-500/20', text: 'text-blue-400' }
    : { label: 'Supplier', bg: 'bg-green-500/20', text: 'text-green-400' };

  return (
    <>
      {/* Mobile hamburger button */}
      {!mobileOpen && (
        <button
          className="fixed top-3 left-3 z-50 lg:hidden p-2 bg-white rounded-lg shadow-md border border-gray-200"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-screen bg-gray-900 text-white flex flex-col z-40
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'} w-64
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-gray-800 flex-shrink-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: BRAND_ORANGE }}>
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className={`ml-3 font-bold text-lg text-white whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
            EtsyManager
          </span>
          {/* Mobile close button */}
          <button
            className="ml-auto lg:hidden p-1 text-gray-400 hover:text-white"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store Selector */}
        <div className="mt-4 mb-2">
          <SidebarStoreSelector collapsed={collapsed} />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
                  ${active
                    ? 'bg-[#d96f36]/15 text-[#d96f36] font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                  ${collapsed ? 'lg:justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r" style={{ backgroundColor: BRAND_ORANGE }} />
                )}
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="border-t border-gray-800 p-3">
          <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
              style={{ backgroundColor: BRAND_ORANGE }}
              title={user.username}
            >
              {userInitials}
            </div>
            <div className={`min-w-0 transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
              <div className="text-sm font-medium text-white truncate">{user.username}</div>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleBadge.bg} ${roleBadge.text}`}>
                {roleBadge.label}
              </span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className={`
              mt-3 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors
              ${collapsed ? 'lg:justify-center' : ''}
            `}
            title="Logout"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className={`text-sm whitespace-nowrap transition-all duration-300 ${collapsed ? 'lg:opacity-0 lg:w-0 lg:overflow-hidden' : 'opacity-100'}`}>
              Logout
            </span>
          </button>
        </div>

        {/* Collapse Toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}
