import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { leagueService } from '../services/leagueService';
import { League } from '../types';
import { Button, Card, Input } from '@/components/ui';
import { Plus, MagnifyingGlass, Trophy, SquaresFour, Rows } from 'phosphor-react';
import { cn } from '@/lib/utils';

const getStatusFilters = (t: (key: string) => string) => [
  { value: '', label: t('common.all') },
  { value: 'geplant', label: t('common.status.planned') },
  { value: 'laufend', label: t('common.status.running') },
  { value: 'abgeschlossen', label: t('common.status.completed') },
];

const STATUS_BADGE: Record<string, string> = {
  geplant: 'bg-info/15 text-info border-info/30',
  laufend: 'bg-warning/15 text-warning border-warning/30',
  abgeschlossen: 'bg-success/15 text-success border-success/30',
};

const STATUS_ACCENT: Record<string, string> = {
  geplant: 'bg-info',
  laufend: 'bg-warning',
  abgeschlossen: 'bg-success',
};

const getModeLabels = (t: (key: string) => string): Record<string, string> => ({
  liga: t('leagues.statusLabels.liga'),
  masters: t('leagues.statusLabels.masters'),
});

export default function Leagues() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, canEdit } = useAuth();
  const { t } = useTranslation();
  const STATUS_FILTERS = getStatusFilters(t);
  const MODE_LABELS = getModeLabels(t);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [viewMode, setViewMode] = useState<'cards' | 'dashboard'>('cards');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

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

  useEffect(() => {
    if (filteredLeagues.length === 0) {
      setSelectedLeagueId(null);
      return;
    }
    const exists = filteredLeagues.some((league) => league.id === selectedLeagueId);
    if (!exists) {
      setSelectedLeagueId(filteredLeagues[0].id);
    }
  }, [filteredLeagues, selectedLeagueId]);

  const selectedLeague = filteredLeagues.find((league) => league.id === selectedLeagueId) || filteredLeagues[0];
  const stats = {
    total: leagues.length,
    running: leagues.filter((league) => league.status === 'laufend').length,
    completed: leagues.filter((league) => league.status === 'abgeschlossen').length,
    planned: leagues.filter((league) => league.status === 'geplant').length,
  };

  if (loading) return <div className="p-8 text-foreground">{t('common.loading')}</div>;

  return (
    <div className="page-shell p-8 bg-background min-h-screen text-foreground">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Trophy size={28} className="text-primary" />
          <h1 className="m-0 text-foreground text-2xl font-semibold">{t('leagues.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-10 overflow-hidden rounded-md border border-border bg-card">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                'inline-flex items-center gap-2 px-3 text-sm transition-colors',
                viewMode === 'cards' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <SquaresFour size={16} />
              Karten
            </button>
            <button
              type="button"
              onClick={() => setViewMode('dashboard')}
              className={cn(
                'inline-flex items-center gap-2 border-l border-border px-3 text-sm transition-colors',
                viewMode === 'dashboard' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <Rows size={16} />
              Dashboard
            </button>
          </div>
          {canEdit && (
            <Button onClick={() => navigate('/leagues/create')}>
              <Plus size={18} className="mr-2 align-middle" />
              {t('leagues.newLeague')}
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3">
        <Card className={cn('relative cursor-pointer border p-4 transition-all hover:bg-accent/30', statusFilter === '' ? 'border-primary shadow-md' : 'border-border')} onClick={() => setStatusFilter('')}>
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md bg-primary" />
          <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Gesamt</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.total}</div>
        </Card>
        <Card className={cn('relative cursor-pointer border p-4 transition-all hover:bg-accent/30', statusFilter === 'laufend' ? 'border-warning shadow-md' : 'border-border')} onClick={() => setStatusFilter('laufend')}>
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md bg-warning" />
          <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Laufend</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.running}</div>
        </Card>
        <Card className={cn('relative cursor-pointer border p-4 transition-all hover:bg-accent/30', statusFilter === 'abgeschlossen' ? 'border-success shadow-md' : 'border-border')} onClick={() => setStatusFilter('abgeschlossen')}>
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md bg-success" />
          <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Abgeschlossen</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.completed}</div>
        </Card>
        <Card className={cn('relative cursor-pointer border p-4 transition-all hover:bg-accent/30', statusFilter === 'geplant' ? 'border-info shadow-md' : 'border-border')} onClick={() => setStatusFilter('geplant')}>
          <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-md bg-info" />
          <div className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Geplant</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{stats.planned}</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map(sf => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                statusFilter === sf.value
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto max-w-[360px] flex-1 min-w-[250px]">
          <MagnifyingGlass size={18} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('common.searchByName')}
            className="pl-9"
          />
        </div>
      </div>

      {filteredLeagues.length === 0 ? (
        <Card>
          <div className="p-6 text-center text-muted-foreground">
            {t('leagues.noLeagues')}
          </div>
        </Card>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {filteredLeagues.map(league => {
            const badgeClass = STATUS_BADGE[league.status] || '';
            return (
              <Card
                key={league.id}
                className="relative cursor-pointer overflow-hidden border border-border bg-card p-0 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lg"
                onClick={() => navigate(`/leagues/${league.id}`)}
              >
                <div className={cn('absolute inset-x-0 top-0 h-[3px]', STATUS_ACCENT[league.status] || 'bg-primary')} />
                <div className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="m-0 text-foreground text-base font-semibold">{league.name}</h3>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Teilnehmer</div>
                      <div className="text-sm font-semibold text-foreground">{league.participant_ids?.length || 0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Turniere</div>
                      <div className="text-sm font-semibold text-foreground">{league.tournament_ids?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="overflow-hidden p-0">
            <div className="divide-y divide-border">
              {filteredLeagues.map((league) => {
                const isSelected = league.id === selectedLeague?.id;
                return (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => {
                      setSelectedLeagueId(league.id);
                      navigate(`/leagues/${league.id}`);
                    }}
                    className={cn(
                      'w-full border-l-2 border-transparent px-4 py-3 text-left transition-colors hover:bg-accent/40',
                      isSelected && 'border-l-primary bg-primary/10'
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-foreground">{league.name}</div>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_BADGE[league.status] || ''}`}>
                        {league.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('leagues.participantCount', { count: league.participant_ids?.length || 0 })} · {t('leagues.tournamentCount', { count: league.tournament_ids?.length || 0 })}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Schnellübersicht</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Gesamt</span><strong>{stats.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Laufend</span><strong>{stats.running}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Abgeschlossen</span><strong>{stats.completed}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Geplant</span><strong>{stats.planned}</strong></div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.08em] text-muted-foreground">Ausgewählte Meisterschaft</div>
              {selectedLeague ? (
                <div className="space-y-1 text-sm">
                  <div className="font-semibold text-foreground">{selectedLeague.name}</div>
                  {selectedLeague.description && (
                    <div className="text-muted-foreground">{selectedLeague.description}</div>
                  )}
                  <div className="text-muted-foreground">
                    {t('leagues.participantCount', { count: selectedLeague.participant_ids?.length || 0 })}
                  </div>
                  <div className="text-muted-foreground">
                    {t('leagues.tournamentCount', { count: selectedLeague.tournament_ids?.length || 0 })}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t('leagues.noLeagues')}</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
