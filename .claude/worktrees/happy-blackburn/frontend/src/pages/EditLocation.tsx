import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent, Input } from '@/components/ui';
import { locationService } from '../services/locationService';
import { Location } from '../types';
import { ArrowLeft } from 'phosphor-react';

export default function EditLocation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!id) return;
    loadLocation();
  }, [id]);

  const loadLocation = async () => {
    setLoading(true);
    try {
      const data = await locationService.getById(Number(id));
      setLocation(data);
      setName(data.name);
    } catch (err) {
      console.warn('Spielort konnte nicht geladen werden.', err);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !name.trim()) return;
    setError(null);
    setSaving(true);
    try {
      await locationService.update(location.id, { name: name.trim() });
      navigate(`/locations/${location.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Spielort konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-foreground">Wird geladen...</div>;
  }
  if (!location) {
    return (
      <div className="p-8 text-foreground">Spielort nicht gefunden.</div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      <div className="mb-6">
        <Button variant="secondary" onClick={() => navigate(`/locations/${location.id}`)}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          Zurück
        </Button>
      </div>
      <Card className="max-w-[400px]">
        <CardContent className="p-6">
          <h2 className="mt-0 text-foreground">Spielort bearbeiten</h2>
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
            <Button type="submit" disabled={saving}>
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
