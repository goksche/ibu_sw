import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { locationService } from '../services/locationService';
import { ArrowLeft } from 'phosphor-react';

export default function CreateLocation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Bitte Namen angeben.');
      return;
    }
    setLoading(true);
    try {
      const loc = await locationService.create({ name: name.trim() });
      navigate(`/locations/${loc.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Spielort konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate('/locations')}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          Zurück
        </Button>
      </div>
      <Card className="max-w-[400px]">
        <CardContent className="p-6">
          <h2 className="mt-0 text-foreground">Neuer Spielort</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block mb-2 text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Halle A"
                required
                className="w-full"
              />
            </div>
            {error && <p className="text-destructive mb-4">{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Wird erstellt...' : 'Erstellen'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
