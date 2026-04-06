import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { leagueService } from '../services/leagueService';
import { League, LeagueStandingsResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PencilSimple, Trash, ArrowLeft, Trophy, Lightning } from 'phosphor-react';
import TournamentSharingPanel from '../components/tournament/TournamentSharingPanel';
import PageHeader from '../components/patterns/management/PageHeader';
import StandingTablePattern, { StandingColumn } from '../components/patterns/tournament/StandingTablePattern';
import TournamentSectionHeader from '../components/patterns/tournament/TournamentSectionHeader';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  geplant: { label: 'common.status.planned', color: 'bg-info/15 text-info border-info/30' },
  laufend: { label: 'common.status.running', color: 'bg-warning/15 text-warning border-warning/30' },
  abgeschlossen: { label: 'common.status.completed', color: 'bg-success/15 text-success border-success/30' },
};

const MODE_LABELS: Record<string, string> = {
  liga: 'leagues.statusLabels.liga',
  masters: 'leagues.statusLabels.masters',
};

const TOURNAMENT_MODE_LABELS: Record<string, string> = {
  round_robin: 'common.mode.roundRobin',
  knockout: 'common.mode.knockout',
  combined: 'common.mode.combi',
};

function formatZeitraum(
  league: { season_type?: string; season_year?: string | null; start_date?: string | null; end_date?: string | null },
  t: (key: string, opts?: any) => string,
): string | null {
  const st = (league as any).season_type;
  if (st === 'year' && league.season_year) return league.season_year;
  if (st === 'season' && league.season_year) return t('league.detail.seasonPrefix', { year: league.season_year });
  if (st === 'dates') {
    const s = league.start_date;
    const e = league.end_date;
    if (s && e) return `${s} – ${e}`;
    if (s) return t('league.detail.fromPrefix', { date: s });
    return null;
  }
  if (league.season_year) return league.season_year;
  return null;
}

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { t } = useTranslation();
  const [league, setLeague] = useState<League | null>(null);
  const [standings, setStandings] = useState<LeagueStandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingKO, setGeneratingKO] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [leagueData, standingsData] = await Promise.all([
        leagueService.getById(Number(id)),
        leagueService.getStandings(Number(id)),
      ]);
      setLeague(leagueData);
      setStandings(standingsData);
    } catch (err) {
      console.warn('Meisterschaft konnte nicht geladen werden.', err);
      setLeague(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!league || !canEdit) return;
    const confirmed = window.confirm(t('league.detail.deleteConfirm', { name: league.name }));
    if (!confirmed) return;
    setDeleting(true);
    try {
      await leagueService.delete(league.id);
      navigate('/leagues');
    } catch (err) {
      console.warn('Meisterschaft konnte nicht gelöscht werden.', err);
      setDeleting(false);
    }
  };

  const handleGenerateMastersKO = async () => {
    if (!league) return;
    const confirmed = window.confirm(t('league.detail.generateMastersKOConfirm'));
    if (!confirmed) return;
    setGeneratingKO(true);
    try {
      await leagueService.generateMastersKO(league.id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || t('league.detail.generateMastersKOError'));
    } finally {
      setGeneratingKO(false);
    }
  };

  if (loading) return <div className="p-8 text-foreground">{t('common.loading')}</div>;
  if (!league) return <div className="p-8 text-foreground">{t('league.detail.notFound')}</div>;

  const statusInfo = STATUS_LABELS[league.status] || STATUS_LABELS.geplant;
  type StandingEntry = LeagueStandingsResponse['entries'][number];
  const standingsColumns: StandingColumn<StandingEntry>[] = [
    {
      key: 'rank',
      label: '#',
      render: (entry) => <span className="font-bold text-muted-foreground">{entry.rank}</span>,
      align: 'left',
    },
    {
      key: 'participant',
      label: t('common.participants'),
      render: (entry) => <span>{entry.first_name} {entry.last_name}</span>,
      align: 'left',
    },
    ...league.tournaments.map((tourney): StandingColumn<StandingEntry> => ({
      key: `tournament_${tourney.id}`,
      label: tourney.name.length > 12 ? `${tourney.name.slice(0, 12)}...` : tourney.name,
      align: 'center',
      render: (entry) => {
        const p = entry.placements.find((placement) => placement.tournament_id === tourney.id);
        if (!p) return <span className="text-muted-foreground/50">–</span>;
        if (p.placement != null) {
          return (
            <span title={`Platz ${p.placement} = ${p.points} Pkt`}>
              <span className="text-muted-foreground">{p.placement}.</span>{' '}
              <span className="font-semibold">{p.points}</span>
            </span>
          );
        }
        if (p.points) {
          return (
            <span title={`${p.points} Pkt`}>
              <span className="font-semibold">{p.points}</span>
            </span>
          );
        }
        return <span className="text-muted-foreground/50">–</span>;
      },
    })),
    {
      key: 'total',
      label: t('league.detail.total'),
      align: 'right',
      render: (entry) => <span className="font-bold text-primary">{entry.total_points}</span>,
    },
  ];

  return (
    <div className="p-8 bg-background min-h-screen text-foreground space-y-6 page-shell">
      <PageHeader
        title={league.name}
        subtitle={league.description || undefined}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/leagues')}>
              <ArrowLeft size={18} className="mr-2 align-middle" />
              {t('common.back')}
            </Button>
            {canEdit && (
              <>
                <Button variant="secondary" onClick={() => navigate(`/leagues/${league.id}/edit`)}>
                  <PencilSimple size={18} className="mr-2 align-middle" />
                  {t('common.edit')}
                </Button>
                <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                  <Trash size={18} className="mr-2 align-middle" />
                  {t('common.delete')}
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Title + Status */}
      <Card className="mb-6 arena-surface">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="mt-0 mb-0 text-foreground">{league.name}</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
              {t(statusInfo.label)}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              {t(MODE_LABELS[league.league_mode] || league.league_mode)}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-primary/30 text-primary bg-primary/10">
              {t('common.tournaments')}: {t(TOURNAMENT_MODE_LABELS[league.tournament_mode] || league.tournament_mode)}
            </span>
          </div>
          {league.description && <p className="text-muted-foreground mt-2">{league.description}</p>}
          {formatZeitraum(league, t) && (
            <p className="text-sm text-muted-foreground mt-1">{t('league.detail.period', { period: formatZeitraum(league, t) })}</p>
          )}

          {/* Placement Points */}
          {league.placement_points && Object.keys(league.placement_points).length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">{t('league.detail.pointsDistribution')}</h4>
              {'top' in league.placement_points ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(league.placement_points as any).top?.map((tp: any) => (
                      <span key={tp.rank} className="text-xs bg-muted px-2 py-1 rounded">
                        {t('league.detail.placePoints', { place: tp.rank, points: tp.points })}
                      </span>
                    ))}
                  </div>
                  {(league.placement_points as any).ko_rounds?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(league.placement_points as any).ko_rounds.map((kr: any, idx: number) => (
                        <span key={idx} className="text-xs bg-info/10 text-info border border-info/20 px-2 py-1 rounded">
                          {kr.label || `Rang ${kr.from_rank}-${kr.to_rank}`}: {kr.points} Pkt
                        </span>
                      ))}
                    </div>
                  )}
                  {(league.placement_points as any).participation_points > 0 && (
                    <div>
                      <span className="text-xs bg-success/10 text-success border border-success/20 px-2 py-1 rounded">
                        {t('league.detail.participationPoints', { points: (league.placement_points as any).participation_points })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(league.placement_points)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([place, points]) => (
                      <span key={place} className="text-xs bg-muted px-2 py-1 rounded">
                        {t('league.detail.placePoints', { place, points: String(points) })}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          {league.league_mode === 'masters' && (
            <div className="mt-3 text-sm text-muted-foreground">
              {t('league.detail.mastersInfo', { count: league.masters_ko_count || 8 })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6 arena-surface">
        <CardContent className="p-6 space-y-4">
          <TournamentSectionHeader
            title={t('league.detail.overallRanking')}
            icon={<Trophy size={22} weight="bold" />}
            actions={
              canEdit && league.league_mode === 'masters' ? (
                <Button variant="secondary" size="sm" onClick={handleGenerateMastersKO} disabled={generatingKO}>
                  <Lightning size={16} className="mr-1 align-middle" />
                  {generatingKO ? t('league.detail.generating') : t('league.detail.generateMastersKO')}
                </Button>
              ) : null
            }
          />

          {!standings || standings.entries.length === 0 ? (
            <span className="text-muted-foreground">{t('league.detail.noStandings')}</span>
          ) : (
            <StandingTablePattern
              rows={standings.entries}
              columns={standingsColumns}
              subtitle={t('league.detail.tournamentsCount', { count: league.tournaments.length })}
            />
          )}
        </CardContent>
      </Card>

      {/* Turniere */}
      <Card className="mb-6 arena-surface">
        <CardContent className="p-6">
          <h3 className="mt-0 mb-4">{t('league.detail.tournamentsCount', { count: league.tournaments.length })}</h3>
          {league.tournaments.length === 0 ? (
            <span className="text-muted-foreground">{t('league.detail.noTournaments')}</span>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
              {league.tournaments.map(tourney => (
                <div
                  key={tourney.id}
                  className="border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/tournaments/${tourney.id}`)}
                >
                  <div className="font-medium text-sm">{tourney.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {tourney.start_date || '–'}
                    {tourney.status && (
                      <span className="ml-2 text-xs">({tourney.status})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teilnehmer */}
      <Card className="arena-surface">
        <CardContent className="p-6">
          <h3 className="mt-0 mb-4">{t('league.detail.participantsCount', { count: league.participants.length })}</h3>
          {league.participants.length === 0 ? (
            <span className="text-muted-foreground">{t('league.detail.noParticipants')}</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {league.participants.map(p => (
                <span key={p.id} className="text-sm bg-muted px-3 py-1 rounded-full">
                  {p.first_name} {p.last_name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <TournamentSharingPanel
          entityType="league"
          entityId={league.id}
          currentVisibility={((league as any).visibility || 'public') as any}
          onVisibilityChange={(v) => setLeague({ ...league, visibility: v } as any)}
        />
      )}
    </div>
  );
}
