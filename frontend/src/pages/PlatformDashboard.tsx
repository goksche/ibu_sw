// Platform Dashboard - Shows available apps for user
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { platformService } from '../services/platformService';
import { App, UserWithPermissions } from '../types';
import { Card, Button } from '../components/ui';
import { theme } from '../theme/theme';
import { SignOut, Gear, SquaresFour } from 'phosphor-react';

export default function PlatformDashboard() {
  const navigate = useNavigate();
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
    return <div style={{ padding: '2rem', color: theme.colors.text.secondary }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', background: theme.colors.background.primary, minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: theme.colors.text.primary }}>Dashboard</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={() => navigate('/admin')}>
              <Gear size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Admin
            </Button>
          )}
          <Button variant="secondary" onClick={handleLogout}>
            <SignOut size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Logout
          </Button>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ color: theme.colors.text.secondary }}>Willkommen, {user?.username}!</p>
      </div>

      <h2 style={{ marginBottom: '1rem', color: theme.colors.text.primary }}>Verfügbare Apps</h2>
      
      {apps.length === 0 ? (
        <p style={{ color: theme.colors.text.secondary }}>Keine Apps verfügbar.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {apps.map((app) => (
            <Card key={app.id} style={{ cursor: 'pointer', padding: '1.5rem' }} onClick={() => handleAppClick(app)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.display_name} style={{ width: '48px', height: '48px' }} />
                ) : (
                  <SquaresFour size={48} color={theme.colors.text.primary} />
                )}
                <div>
                  <h3 style={{ margin: 0, color: theme.colors.text.primary }}>{app.display_name}</h3>
                  {app.version && <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.text.secondary }}>v{app.version}</p>}
                </div>
              </div>
              {app.description && <p style={{ color: theme.colors.text.secondary, fontSize: '0.875rem' }}>{app.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

