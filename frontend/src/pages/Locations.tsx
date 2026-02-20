import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { locationService } from '../services/locationService';
import { Location } from '../types';
import { Button, Card, CardContent, Input } from '@/components/ui';
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
    return <div className="p-8 text-foreground">Wird geladen...</div>;
  }

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            <ArrowLeft size={18} className="mr-2 align-middle" />
            Zurück
          </Button>
          <MapPin size={28} className="text-primary" />
          <h1 className="m-0 text-foreground text-2xl font-semibold">
            Spielorte / Locations
          </h1>
        </div>
        {canEdit && (
          <Button onClick={() => navigate('/locations/create')}>
            <Plus size={18} className="mr-2 align-middle" />
            Neuer Spielort
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative max-w-[320px] w-full">
          <MagnifyingGlass
            size={18}
            className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Name suchen..."
            className="pl-9"
          />
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Keine Spielorte gefunden.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredLocations.map((loc) => (
            <Card
              key={loc.id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => navigate(`/locations/${loc.id}`)}
            >
              <h3 className="m-0 mb-2 text-foreground">{loc.name}</h3>
              <div className="text-muted-foreground text-sm">
                {loc.spielfelder?.length ?? 0} Spielfelder
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
