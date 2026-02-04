import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
import { locationService } from '../services/locationService';
import { Location } from '../types';
import { theme } from '../theme/theme';
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
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  }
  if (!location) {
    return (
      <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Spielort nicht gefunden.</div>
    );
  }

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Button variant="secondary" onClick={() => navigate(`/locations/${location.id}`)}>
          <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Zurück
        </Button>
      </div>
      <Card style={{ padding: '1.5rem', maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0, color: '#ffd700' }}>Spielort bearbeiten</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cccccc' }}>Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Halle A"
              required
              style={{ width: '100%' }}
            />
          </div>
          {error && <p style={{ color: '#ee4444', marginBottom: '1rem' }}>{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
