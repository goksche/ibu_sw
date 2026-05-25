import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardContent } from '@/components/ui';
import { leagueService } from '../services/leagueService';
import { League, LeagueStandingsResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { PencilSimple, Trash, ArrowLeft, Trophy, Lightning } from 'phosphor-react';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  geplant: { label: 'Geplant', color: 'bg-info/15 text-info border-info/30' },
  laufend: { label: 'Laufend', color: 'bg-warning/15 text-warning border-warning/30' },
  abgeschlossen: { label: 'Abgeschlossen', color: 'bg-success/15 text-success border-success/30' },
};

const MODE_LABELS: Record<string, string> = {
  liga: 'Liga',
  masters: 'Masters (Liga + KO)',
};

const TOURNAMENT_MODE_LABELS: Record<string, string> = {
  round_robin: 'Liga',
  knockout: 'KO',
  combined: 'Kombi',
};

function formatZeitraum(league: { season_type?: string; season_year?: string | null; start_date?: string | null; end_date?: string | null }): string | null {
  const st = (league as any).season_type;
  if (st === 'year' && league.season_year) return league.season_year;
  if (st === 'season' && league.season_year) return `Saison ${league.season_year}`;
  if (st === 'dates') {
    const s = league.start_date;
    const e = league.end_date;
    if (s && e) return `${s} – ${e}`;
    if (s) return `ab ${s}`;
    return null;
  }
  if (league.season_year) return league.season_year;
  return null;
}

export default function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
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
    const confirmed = window.confirm(`Meisterschaft "${league.name}" wirklich löschen?`);
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
    const confirmed = window.confirm('Finale KO-Turnier aus der aktuellen Gesamtwertung generieren?');
    if (!confirmed) return;
    setGeneratingKO(true);
    try {
      await leagueService.generateMastersKO(league.id);
      await loadData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Fehler beim Generieren des Masters-KO-Turniers');
    } finally {
      setGeneratingKO(false);
    }
  };

  if (loading) return <div className="p-8 text-foreground">Wird geladen...</div>;
  if (!league) return <div className="p-8 text-foreground">Meisterschaft nicht gefunden.</div>;

  const statusInfo = STATUS_LABELS[league.status] || STATUS_LABELS.geplant;

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Button variant="secondary" onClick={() => navigate('/leagues')}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          Zurück
        </Button>
        {canEdit && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate(`/leagues/${league.id}/edit`)}>
              <PencilSimple size={18} className="mr-2 align-middle" />
              Bearbeiten
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              <Trash size={18} className="mr-2 align-middle" />
              Löschen
            </Button>
          </div>
        )}
      </div>

      {/* Title + Status */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="mt-0 mb-0 text-foreground">{league.name}</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              {MODE_LABELS[league.league_mode] || league.league_mode}
            </span>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-primary/30 text-primary bg-primary/10">
              Turniere: {TOURNAMENT_MODE_LABELS[league.tournament_mode] || league.tournament_mode}
            </span>
          </div>
          {league.description && <p className="text-muted-foreground mt-2">{league.description}</p>}
          {formatZeitraum(league) && (
            <p className="text-sm text-muted-foreground mt-1">Zeitraum: {formatZeitraum(league)}</p>
          )}

          {/* Placement Points */}
          {league.placement_points && Object.keys(league.placement_points).length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">Punkteverteilung</h4>
              {'top' in league.placement_points ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {(league.placement_points as any).top?.map((t: any) => (
                      <span key={t.rank} className="text-xs bg-muted px-2 py-1 rounded">
                        {t.rank}. Platz: {t.points} Pkt
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
                        Teilnahme: {(league.placement_points as any).participation_points} Pkt
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
                        {place}. Platz: {String(points)} Pkt
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          {league.league_mode === 'masters' && (
            <div className="mt-3 text-sm text-muted-foreground">
              Top {league.masters_ko_count || 8} qualifizieren sich für das finale KO-Turnier.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gesamtrangliste */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={22} weight="bold" className="text-primary" />
              <h3 className="mt-0 mb-0">Gesamtrangliste</h3>
            </div>
            {canEdit && league.league_mode === 'masters' && (
              <Button variant="secondary" size="sm" onClick={handleGenerateMastersKO} disabled={generatingKO}>
                <Lightning size={16} className="mr-1 align-middle" />
                {generatingKO ? 'Generiere...' : 'Masters Finale generieren'}
              </Button>
            )}
          </div>

          {!standings || standings.entries.length === 0 ? (
            <span className="text-muted-foreground">Keine Daten vorhanden. Turniere müssen erst durchgeführt werden.</span>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-semibold">#</th>
                    <th className="text-left py-2 px-3 font-semibold">Teilnehmer</th>
                    {league.tournaments.map(t => (
                      <th key={t.id} className="text-center py-2 px-3 font-semibold text-xs max-w-[100px] truncate" title={t.name}>
                        {t.name.length > 12 ? t.name.slice(0, 12) + '...' : t.name}
                      </th>
                    ))}
                    <th className="text-right py-2 px-3 font-bold">Gesamt</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.entries.map((entry) => (
                    <tr key={entry.participant_id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-bold text-muted-foreground">{entry.rank}</td>
                      <td className="py-2 px-3">{entry.first_name} {entry.last_name}</td>
                      {entry.placements.map((p) => (
                        <td key={p.tournament_id} className="text-center py-2 px-3 text-xs">
                          {p.placement != null ? (
                            <span title={`Platz ${p.placement} = ${p.points} Pkt`}>
                              <span className="text-muted-foreground">{p.placement}.</span>
                              {' '}
                              <span className="font-semibold">{p.points}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">–</span>
                          )}
                        </td>
                      ))}
                      <td className="text-right py-2 px-3 font-bold text-primary">{entry.total_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Turniere */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="mt-0 mb-4">Turniere ({league.tournaments.length})</h3>
          {league.tournaments.length === 0 ? (
            <span className="text-muted-foreground">Keine Turniere zugeordnet</span>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
              {league.tournaments.map(t => (
                <div
                  key={t.id}
                  className="border border-border rounded-lg p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/tournaments/${t.id}`)}
                >
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t.start_date || '–'}
                    {t.status && (
                      <span className="ml-2 text-xs">({t.status})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teilnehmer */}
      <Card>
        <CardContent className="p-6">
          <h3 className="mt-0 mb-4">Teilnehmer ({league.participants.length})</h3>
          {league.participants.length === 0 ? (
            <span className="text-muted-foreground">Keine Teilnehmer zugeordnet</span>
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
    </div>
  );
}
