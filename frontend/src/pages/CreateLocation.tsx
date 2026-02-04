import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components/ui';
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
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Button variant="secondary" onClick={() => navigate('/locations')}>
          <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Zurück
        </Button>
      </div>
      <Card style={{ padding: '1.5rem', maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0, color: '#ffd700' }}>Neuer Spielort</h2>
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
          <Button type="submit" disabled={loading}>
            {loading ? 'Wird erstellt...' : 'Erstellen'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
