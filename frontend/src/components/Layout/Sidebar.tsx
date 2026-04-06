// Sidebar Component - Collapsible navigation
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '@/lib/utils';
import LanguageSwitcher from '../LanguageSwitcher';
import {
  House,
  Trophy,
  ChartLine,
  ChartBar,
  MapPin,
  Users,
  Gear,
  UserGear,
  ClipboardText,
  UserList,
  UserCircle,
  CaretLeft,
  CaretRight,
  Info,
} from 'phosphor-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  powerAdminOnly?: boolean;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isAdmin, isPowerAdmin } = useAuth();

  const navItems: NavItem[] = [
    { path: '/dashboard', label: t('sidebar.dashboard'), icon: <House size={22} weight="bold" /> },
    { path: '/tournaments', label: t('sidebar.tournaments'), icon: <Trophy size={22} weight="bold" /> },
    { path: '/wiki', label: 'Wiki', icon: <Info size={22} weight="bold" /> },
    { path: '/leagues', label: t('sidebar.leagues'), icon: <ChartLine size={22} weight="bold" /> },
    { path: '/locations', label: t('sidebar.locations'), icon: <MapPin size={22} weight="bold" /> },
    { path: '/participants', label: t('sidebar.participants'), icon: <Users size={22} weight="bold" /> },
    { path: '/statistics', label: t('sidebar.statistics'), icon: <ChartBar size={22} weight="bold" /> },
    { path: '/profile/edit', label: t('sidebar.profile'), icon: <UserCircle size={22} weight="bold" /> },
    { path: '/settings', label: t('sidebar.settings'), icon: <Gear size={22} weight="bold" /> },
    { path: '/admin/users', label: t('sidebar.users'), icon: <UserGear size={22} weight="bold" />, adminOnly: true },
    { path: '/admin/logs', label: t('sidebar.logs'), icon: <ClipboardText size={22} weight="bold" />, adminOnly: true },
    { path: '/admin/registrations', label: t('sidebar.registrations'), icon: <UserList size={22} weight="bold" />, powerAdminOnly: true },
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

  const filteredItems = navItems.filter(item => {
    if (item.powerAdminOnly) return isPowerAdmin;
    if (item.adminOnly) return isAdmin;
    return true;
  });
  const regularItems = filteredItems.filter(item => !item.adminOnly && !item.powerAdminOnly);
  const adminItems = filteredItems.filter(item => item.adminOnly || item.powerAdminOnly);

  return (
    <aside
      className={cn(
        'sidebar-shell fixed top-0 left-0 h-screen bg-sidebar border-r border-border flex flex-col transition-[width] duration-300 ease-in-out z-[1100] overflow-hidden',
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
        <div className="sidebar-brand-mark w-9 h-9 min-w-[36px] bg-primary rounded-lg flex items-center justify-center font-bold text-sm text-primary-foreground">
          FS
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-base font-bold text-foreground tracking-wide leading-tight">
              {t('sidebar.brandName')}
            </div>
            <div className="text-[0.7rem] text-muted-foreground tracking-wide">
              {t('sidebar.brandSubtitle')}
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
                {t('sidebar.admin')}
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

      {/* Language Switcher */}
      <div className="border-t border-border px-1 py-1.5 shrink-0">
        <LanguageSwitcher collapsed={collapsed} />
      </div>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-2 shrink-0">
        <button
          onClick={onToggle}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapseTitle')}
          className={cn(
            'sidebar-nav-item',
            'w-full flex items-center gap-2 py-2.5 px-3 bg-transparent border-none text-muted-foreground cursor-pointer rounded-md transition-colors text-sm hover:bg-sidebar-hover hover:text-foreground',
            collapsed ? 'justify-center' : 'justify-end'
          )}
        >
          {collapsed ? (
            <CaretRight size={18} weight="bold" />
          ) : (
            <>
              <span>{t('sidebar.collapse')}</span>
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
        'sidebar-nav-item',
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
