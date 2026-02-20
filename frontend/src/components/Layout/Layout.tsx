// Layout Component - Sidebar + TopBar + Main Content
import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Footer from '../Footer';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Responsive: auto-collapse on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <TopBar sidebarCollapsed={collapsed} />

      <div
        className={cn(
          'flex-1 flex flex-col transition-[margin-left] duration-300 ease-in-out',
          collapsed ? 'ml-[var(--sidebar-collapsed-width)]' : 'ml-[var(--sidebar-width)]'
        )}
        style={{ minHeight: 'calc(100vh - var(--topbar-height))' }}
      >
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
