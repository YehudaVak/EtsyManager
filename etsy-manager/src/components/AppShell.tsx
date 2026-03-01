'use client';

import { useAuth } from '@/lib/auth';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/lib/sidebar-context';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  const isLoginPage = pathname === '/';
  const showSidebar = !isLoginPage && !isLoading && !!user;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <Sidebar />
      <main
        className={`transition-all duration-300 ${
          collapsed ? 'lg:ml-[68px]' : 'lg:ml-64'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
