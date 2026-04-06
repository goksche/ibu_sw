// Platform Dashboard - Shows available apps for user
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { platformService } from '../services/platformService';
import { App, UserWithPermissions } from '../types';
import { Card, Button } from '@/components/ui';
import { SignOut, Gear, SquaresFour } from 'phosphor-react';

export default function PlatformDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [apps, setApps] = useState<App[]>([]);
  const [user, setUser] = useState<UserWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }

    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appsData, userData] = await Promise.all([
        platformService.getDashboardApps(),
        authService.getCurrentUser()
      ]);
      setApps(appsData);
      setUser(userData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const handleAppClick = (app: App) => {
    window.location.href = app.route_path;
  };

  if (loading) {
    return <div className="p-8 text-muted-foreground">{t('app.loading')}</div>;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="m-0 text-foreground">{t('platform.title')}</h1>
        <div className="flex gap-4">
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={() => navigate('/admin')}>
              <Gear size={20} className="mr-2 align-middle" />
              {t('platform.admin')}
            </Button>
          )}
          <Button variant="secondary" onClick={handleLogout}>
            <SignOut size={20} className="mr-2 align-middle" />
            {t('platform.logout')}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-muted-foreground">{t('platform.welcome', { username: user?.username })}</p>
      </div>

      <h2 className="mb-4 text-foreground">{t('platform.availableApps')}</h2>

      {apps.length === 0 ? (
        <p className="text-muted-foreground">{t('platform.noApps')}</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
          {apps.map((app) => (
            <Card
              key={app.id}
              className="cursor-pointer p-6 hover:bg-accent/50 transition-colors"
              onClick={() => handleAppClick(app)}
            >
              <div className="flex items-center gap-4 mb-4">
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.display_name} className="w-12 h-12" />
                ) : (
                  <SquaresFour size={48} className="text-foreground" />
                )}
                <div>
                  <h3 className="m-0 text-foreground">{app.display_name}</h3>
                  {app.version && <p className="m-0 text-sm text-muted-foreground">v{app.version}</p>}
                </div>
              </div>
              {app.description && <p className="text-muted-foreground text-sm">{app.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
