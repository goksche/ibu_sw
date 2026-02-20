// Sidebar Component - Collapsible navigation
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  House,
  Trophy,
  ChartLine,
  MapPin,
  Users,
  Gear,
  UserGear,
  ClipboardText,
  CaretLeft,
  CaretRight,
} from 'phosphor-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: <House size={22} weight="bold" /> },
    { path: '/tournaments', label: 'Turniere', icon: <Trophy size={22} weight="bold" /> },
    { path: '/leagues', label: 'Meisterschaften', icon: <ChartLine size={22} weight="bold" /> },
    { path: '/locations', label: 'Spielorte', icon: <MapPin size={22} weight="bold" /> },
    { path: '/participants', label: 'Teilnehmer', icon: <Users size={22} weight="bold" /> },
    { path: '/settings', label: 'Einstellungen', icon: <Gear size={22} weight="bold" />, adminOnly: true },
    { path: '/admin/users', label: 'Benutzer', icon: <UserGear size={22} weight="bold" />, adminOnly: true },
    { path: '/admin/logs', label: 'Logs', icon: <ClipboardText size={22} weight="bold" />, adminOnly: true },
  ];

  const isActive = (path: string): boolean => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    if (path === '/tournaments') {
      return location.pathname === '/dashboard' ? false : location.pathname.startsWith('/tournaments');
    }
    return location.pathname.startsWith(path);
  };

  const filteredItems = navItems.filter(item => !item.adminOnly || isAdmin);
  const regularItems = filteredItems.filter(item => !item.adminOnly);
  const adminItems = filteredItems.filter(item => item.adminOnly);

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen bg-sidebar border-r border-border flex flex-col transition-[width] duration-300 ease-in-out z-[1100] overflow-hidden',
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'h-[var(--topbar-height)] flex items-center border-b border-border cursor-pointer shrink-0 gap-3 overflow-hidden whitespace-nowrap',
          collapsed ? 'px-3' : 'px-5'
        )}
        onClick={() => navigate('/dashboard')}
      >
        <div className="w-9 h-9 min-w-[36px] bg-primary rounded-lg flex items-center justify-center font-bold text-sm text-primary-foreground">
          FS
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-base font-bold text-foreground tracking-wide leading-tight">
              FinalStage.ch
            </div>
            <div className="text-[0.7rem] text-muted-foreground tracking-wide">
              Turnier-Verwaltung
            </div>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
        {regularItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            active={isActive(item.path)}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
          />
        ))}

        {/* Admin Separator */}
        {adminItems.length > 0 && (
          <div className="mx-2 my-3 border-t border-border">
            {!collapsed && (
              <div className="text-[0.65rem] text-muted-foreground uppercase tracking-widest px-3 pt-3 pb-1">
                Admin
              </div>
            )}
          </div>
        )}

        {adminItems.map((item) => (
          <SidebarNavItem
            key={item.path}
            item={item}
            active={isActive(item.path)}
            collapsed={collapsed}
            onClick={() => navigate(item.path)}
          />
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={onToggle}
          title={collapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
          className={cn(
            'w-full flex items-center gap-2 py-2.5 px-3 bg-transparent border-none text-muted-foreground cursor-pointer rounded-md transition-colors text-sm hover:bg-sidebar-hover hover:text-foreground',
            collapsed ? 'justify-center' : 'justify-end'
          )}
        >
          {collapsed ? (
            <CaretRight size={18} weight="bold" />
          ) : (
            <>
              <span>Einklappen</span>
              <CaretLeft size={18} weight="bold" />
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

/* Individual nav item */
function SidebarNavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        'w-full flex items-center gap-3 border-none cursor-pointer rounded-md transition-colors text-sm whitespace-nowrap overflow-hidden mb-0.5',
        collapsed ? 'py-2.5 px-0 justify-center' : 'py-2.5 px-3 justify-start',
        active
          ? 'bg-sidebar-active text-primary font-semibold'
          : 'bg-transparent text-muted-foreground font-normal hover:bg-sidebar-hover hover:text-foreground'
      )}
    >
      <span className="min-w-[22px] flex items-center justify-center">
        {item.icon}
      </span>
      {!collapsed && <span>{item.label}</span>}
    </button>
  );
}
