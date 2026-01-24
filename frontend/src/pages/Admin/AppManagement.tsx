// Admin App Management
import { useState, useEffect } from 'react';
import { platformService } from '../../services/platformService';
import { App } from '../../types';
import { Button, Card } from '../../components/ui';
import { theme } from '../../theme/theme';

export default function AppManagement() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      const data = await platformService.getApps();
      setApps(data);
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: theme.colors.text.secondary }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', background: theme.colors.background.primary, minHeight: '100vh' }}>
      <h1 style={{ color: theme.colors.text.primary }}>App-Verwaltung</h1>
      <div style={{ marginBottom: '1rem' }}>
        <Button variant="success">Neue App</Button>
      </div>
      <div>
        {apps.map((app) => (
          <Card key={app.id} style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, marginBottom: '0.5rem', color: theme.colors.text.primary }}>{app.display_name}</h3>
                <p style={{ margin: '0.25rem 0', color: theme.colors.text.secondary }}>{app.description}</p>
                <p style={{ margin: '0.25rem 0', color: theme.colors.text.secondary }}>Status: {app.status}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button variant="warning">Bearbeiten</Button>
                <Button variant="danger">Löschen</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


