import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/leagueService';
import { League } from '../types';
import { Button, Card, Input } from '@/components/ui';
import { Plus, MagnifyingGlass, Trophy } from 'phosphor-react';

const STATUS_FILTERS = [
  { value: '', label: 'Alle' },
  { value: 'geplant', label: 'Geplant' },
  { value: 'laufend', label: 'Laufend' },
  { value: 'abgeschlossen', label: 'Abgeschlossen' },
];

const STATUS_BADGE: Record<string, string> = {
  geplant: 'bg-info/15 text-info border-info/30',
  laufend: 'bg-warning/15 text-warning border-warning/30',
  abgeschlossen: 'bg-success/15 text-success border-success/30',
};

const MODE_LABELS: Record<string, string> = {
  liga: 'Liga',
  masters: 'Masters',
};

export default function Leagues() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, canEdit } = useAuth();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    loadLeagues();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
  }, [searchParams]);

  const loadLeagues = async () => {
    try {
      const data = await leagueService.getAll();
      setLeagues(data);
    } catch (err) {
      console.warn('Meisterschaften konnten nicht geladen werden.', err);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeagues = leagues.filter(league => {
    const matchesSearch = !searchTerm || league.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || league.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) return <div className="p-8 text-foreground">Wird geladen...</div>;

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Trophy size={28} className="text-primary" />
          <h1 className="m-0 text-foreground text-2xl font-semibold">Meisterschaften / Ligen</h1>
        </div>
        {canEdit && (
          <Button onClick={() => navigate('/leagues/create')}>
            <Plus size={18} className="mr-2 align-middle" />
            Neue Meisterschaft
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative max-w-[320px] w-full">
          <MagnifyingGlass size={18} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nach Name suchen..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(sf => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                statusFilter === sf.value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {filteredLeagues.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-muted-foreground">
            Keine Meisterschaften gefunden.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredLeagues.map(league => {
            const badgeClass = STATUS_BADGE[league.status] || '';
            return (
              <Card
                key={league.id}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="m-0 text-foreground text-base">{league.name}</h3>
                  <div className="flex gap-1.5">
                    {league.league_mode && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">
                        {MODE_LABELS[league.league_mode] || league.league_mode}
                      </span>
                    )}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${badgeClass}`}>
                      {league.status}
                    </span>
                  </div>
                </div>
                {league.description && (
                  <p className="m-0 mb-3 text-muted-foreground text-sm line-clamp-2">{league.description}</p>
                )}
                <div className="flex justify-between text-muted-foreground text-sm">
                  <span>{league.participant_ids?.length || 0} Teilnehmer</span>
                  <span>{league.tournament_ids?.length || 0} Turniere</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
