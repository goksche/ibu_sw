// Layout Component - Sidebar + TopBar + Main Content
import { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Footer from '../Footer';
import AnimatedCyberBackdrop from '../AnimatedCyberBackdrop';
import { useDataLayout } from '@/hooks/useDataLayout';
import { cn } from '@/lib/utils';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const dataLayout = useDataLayout();
  const showCyberBackdrop = dataLayout !== 'standard';

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

  useEffect(() => {
    if (showCyberBackdrop) {
      document.documentElement.setAttribute('data-cyber-canvas', '1');
    } else {
      document.documentElement.removeAttribute('data-cyber-canvas');
    }
    return () => document.documentElement.removeAttribute('data-cyber-canvas');
  }, [showCyberBackdrop]);

  return (
    /* Kein overflow-y im Layout: lange Listen (Teilnehmer) per normalem Fenster-Scroll — eine Scroll-Spalte, volle Liste sichtbar */
    <div
      className={cn(
        'layout-shell relative min-h-screen text-foreground flex flex-col',
        showCyberBackdrop ? 'bg-transparent' : 'bg-background'
      )}
    >
      {showCyberBackdrop && <AnimatedCyberBackdrop />}
      <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      <TopBar sidebarCollapsed={collapsed} />

      <div
        className={cn(
          'relative z-[5] flex flex-1 flex-col transition-[margin-left] duration-300 ease-in-out',
          collapsed ? 'ml-[var(--sidebar-collapsed-width)]' : 'ml-[var(--sidebar-width)]'
        )}
      >
        <main className="layout-main w-full max-w-[1400px] mx-auto p-6">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
