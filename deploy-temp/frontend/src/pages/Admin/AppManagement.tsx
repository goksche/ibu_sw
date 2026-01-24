// Admin App Management
import { useState, useEffect } from 'react';
import { platformService } from '../../services/platformService';
import { App } from '../../types';
import { Button, Card } from '../../components/ui';

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
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>App-Verwaltung</h1>
      <div style={{ marginBottom: '1rem' }}>
        <Button>Neue App</Button>
      </div>
      <div>
        {apps.map((app) => (
          <Card key={app.id} style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>{app.display_name}</h3>
                <p>{app.description}</p>
                <p>Status: {app.status}</p>
              </div>
              <div>
                <Button>Bearbeiten</Button>
                <Button>Löschen</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

