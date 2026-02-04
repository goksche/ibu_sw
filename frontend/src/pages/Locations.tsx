import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { locationService } from '../services/locationService';
import { Location } from '../types';
import { Button, Card, Input } from '../components/ui';
import { theme } from '../theme/theme';
import { Plus, MagnifyingGlass, MapPin, ArrowLeft } from 'phosphor-react';

export default function Locations() {
  const navigate = useNavigate();
  const { isAuthenticated, canEdit } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadLocations();
  }, [isAuthenticated, navigate]);

  const loadLocations = async () => {
    try {
      const data = await locationService.getAll();
      setLocations(data);
    } catch (err) {
      console.warn('Spielorte konnten nicht geladen werden.', err);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(
    (loc) => !searchTerm || loc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div style={{ padding: '2rem', color: theme.colors.text.primary }}>Wird geladen...</div>;
  }

  return (
    <div style={{ padding: '2rem', background: '#000000', minHeight: '100vh', color: '#ffffff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Zurück
          </Button>
          <MapPin size={28} color="#ffd700" />
          <h1 style={{ margin: 0, color: '#ffd700', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Spielorte / Locations
          </h1>
        </div>
        {canEdit && (
          <Button onClick={() => navigate('/locations/create')}>
            <Plus size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Neuer Spielort
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
          <MagnifyingGlass
            size={18}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#888',
            }}
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Name suchen..."
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <Card style={{ padding: '1.5rem', textAlign: 'center', color: '#cccccc' }}>
          Keine Spielorte gefunden.
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {filteredLocations.map((loc) => (
            <Card
              key={loc.id}
              style={{ padding: '1rem', cursor: 'pointer' }}
              onClick={() => navigate(`/locations/${loc.id}`)}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffd700' }}>{loc.name}</h3>
              <div style={{ color: '#cccccc', fontSize: '0.85rem' }}>
                {loc.spielfelder?.length ?? 0} Spielfelder
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
