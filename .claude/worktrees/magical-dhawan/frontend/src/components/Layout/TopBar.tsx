// TopBar Component - Top navigation bar with logout
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SignOut } from 'phosphor-react';
import { cn } from '@/lib/utils';

interface TopBarProps {
  sidebarCollapsed: boolean;
}

export default function TopBar({ sidebarCollapsed }: TopBarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className={cn(
        'sticky top-0 h-[var(--topbar-height)] bg-card border-b border-border flex items-center justify-between px-6 z-[1000] transition-[margin-left] duration-300 ease-in-out',
        sidebarCollapsed ? 'ml-[var(--sidebar-collapsed-width)]' : 'ml-[var(--sidebar-width)]'
      )}
    >
      {/* Left: User info */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground font-medium">
          {user ? `Angemeldet als ${user.username}` : ''}
        </span>
      </div>

      {/* Right: Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-3 py-1.5 bg-transparent border border-border text-muted-foreground rounded-md text-sm transition-colors hover:border-destructive hover:text-destructive"
      >
        <SignOut size={18} />
        <span>Logout</span>
      </button>
    </header>
  );
}
