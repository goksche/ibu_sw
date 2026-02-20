// Admin App Management
import { useState, useEffect } from 'react';
import { platformService } from '../../services/platformService';
import { App } from '../../types';
import { Button, Card } from '@/components/ui';

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
    return <div className="p-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <h1 className="text-foreground">App-Verwaltung</h1>
      <div className="mb-4">
        <Button variant="success">Neue App</Button>
      </div>
      <div>
        {apps.map((app) => (
          <Card key={app.id} className="mb-4 p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="m-0 mb-2 text-foreground">{app.display_name}</h3>
                <p className="m-1 text-muted-foreground">{app.description}</p>
                <p className="m-1 text-muted-foreground">Status: {app.status}</p>
              </div>
              <div className="flex gap-2">
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
