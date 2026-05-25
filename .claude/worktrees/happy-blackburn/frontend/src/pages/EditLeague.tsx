import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft, Trash } from 'phosphor-react';
import { participantService } from '../services/participantService';
import { tournamentService } from '../services/tournamentService';
import { leagueService } from '../services/leagueService';
import { Participant, Tournament, League, PlacementPointsSchema, TournamentModeForLeague } from '../types';

interface TopEntry { rank: number; points: number; }
interface KORoundEntry { label: string; fromRank: number; toRank: number; points: number; }

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);

function parsePlacementPoints(pp: any): { top: TopEntry[]; koRounds: KORoundEntry[]; participationPoints: number } {
  if (!pp) return { top: [], koRounds: [], participationPoints: 0 };
  if (pp.top) {
    return {
      top: (pp.top || []).map((t: any) => ({ rank: t.rank, points: t.points })),
      koRounds: (pp.ko_rounds || []).map((k: any) => ({ label: k.label || '', fromRank: k.from_rank, toRank: k.to_rank, points: k.points })),
      participationPoints: pp.participation_points ?? 0,
    };
  }
  const entries = Object.entries(pp).map(([k, v]) => ({ rank: Number(k), points: v as number })).sort((a, b) => a.rank - b.rank);
  return { top: entries, koRounds: [], participationPoints: 0 };
}

function parseSeasonYear(sy: string | null): { from: string; to: string } {
  if (!sy) return { from: String(CURRENT_YEAR), to: String(CURRENT_YEAR + 1) };
  if (sy.includes('/')) {
    const [f, t] = sy.split('/');
    return { from: f, to: t };
  }
  return { from: sy, to: String(Number(sy) + 1) };
}

export default function EditLeague() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [loadingLeague, setLoadingLeague] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [league, setLeague] = useState<League | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'geplant' as string,
    seasonType: 'year' as 'year' | 'dates' | 'season',
    seasonYear: String(CURRENT_YEAR),
    seasonFrom: String(CURRENT_YEAR),
    seasonTo: String(CURRENT_YEAR + 1),
    startDate: '',
    endDate: '',
    leagueMode: 'liga' as 'liga' | 'masters',
    mastersKoCount: 8,
    tournamentMode: 'combined' as TournamentModeForLeague,
    topPlacements: [] as TopEntry[],
    koRounds: [] as KORoundEntry[],
    participationPoints: 0,
    participantIds: [] as number[],
    tournamentIds: [] as number[],
  });

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      const [leagueData, pList, tList] = await Promise.all([
        leagueService.getById(Number(id)),
        participantService.getAll(),
        tournamentService.getAll(),
      ]);
      setLeague(leagueData);
      setParticipants(pList);
      setTournaments(tList);

      const parsed = parsePlacementPoints(leagueData.placement_points);
      const seasonParsed = parseSeasonYear(leagueData.season_year);

      setFormData({
        name: leagueData.name,
        description: leagueData.description || '',
        status: leagueData.status || 'geplant',
        seasonType: leagueData.season_type || 'year',
        seasonYear: leagueData.season_year?.includes('/') ? String(CURRENT_YEAR) : (leagueData.season_year || String(CURRENT_YEAR)),
        seasonFrom: seasonParsed.from,
        seasonTo: seasonParsed.to,
        startDate: leagueData.start_date || '',
        endDate: leagueData.end_date || '',
        leagueMode: leagueData.league_mode || 'liga',
        mastersKoCount: leagueData.masters_ko_count || 8,
        tournamentMode: leagueData.tournament_mode || 'combined',
        topPlacements: parsed.top,
        koRounds: parsed.koRounds,
        participationPoints: parsed.participationPoints,
        participantIds: leagueData.participant_ids || [],
        tournamentIds: leagueData.tournament_ids || [],
      });
    } catch (err) {
      console.warn('Meisterschaft konnte nicht geladen werden.', err);
    } finally {
      setLoadingLeague(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleId = (idVal: number, key: 'participantIds' | 'tournamentIds') => {
    setFormData(prev => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(idVal) ? list.filter(x => x !== idVal) : [...list, idVal] };
    });
  };

  const updateTop = (idx: number, field: 'rank' | 'points', value: number) => {
    setFormData(prev => { const u = [...prev.topPlacements]; u[idx] = { ...u[idx], [field]: value }; return { ...prev, topPlacements: u }; });
  };
  const addTop = () => {
    setFormData(prev => {
      const next = prev.topPlacements.length > 0 ? Math.max(...prev.topPlacements.map(t => t.rank)) + 1 : 1;
      return { ...prev, topPlacements: [...prev.topPlacements, { rank: next, points: 0 }] };
    });
  };
  const removeTop = (idx: number) => setFormData(prev => ({ ...prev, topPlacements: prev.topPlacements.filter((_, i) => i !== idx) }));

  const updateKO = (idx: number, field: keyof KORoundEntry, value: string | number) => {
    setFormData(prev => { const u = [...prev.koRounds]; u[idx] = { ...u[idx], [field]: value }; return { ...prev, koRounds: u }; });
  };
  const addKORound = () => {
    const lastTo = formData.koRounds.length > 0 ? formData.koRounds[formData.koRounds.length - 1].toRank : (formData.topPlacements.length > 0 ? Math.max(...formData.topPlacements.map(t => t.rank)) : 4);
    setFormData(prev => ({ ...prev, koRounds: [...prev.koRounds, { label: '', fromRank: lastTo + 1, toRank: lastTo * 2, points: 0 }] }));
  };
  const removeKORound = (idx: number) => setFormData(prev => ({ ...prev, koRounds: prev.koRounds.filter((_, i) => i !== idx) }));

  const buildPlacementPoints = (): PlacementPointsSchema | Record<string, number> => {
    if (formData.tournamentMode === 'round_robin') {
      const obj: Record<string, number> = {};
      for (const t of formData.topPlacements) obj[String(t.rank)] = t.points;
      return obj;
    }
    return {
      top: formData.topPlacements.map(t => ({ rank: t.rank, points: t.points })),
      ko_rounds: formData.koRounds.map(k => ({ label: k.label, from_rank: k.fromRank, to_rank: k.toRank, points: k.points })),
      participation_points: formData.tournamentMode === 'combined' ? Number(formData.participationPoints) : 0,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        status: formData.status,
        league_mode: formData.leagueMode,
        tournament_mode: formData.tournamentMode,
        placement_points: buildPlacementPoints(),
        masters_ko_count: formData.leagueMode === 'masters' ? Number(formData.mastersKoCount) : null,
        participant_ids: formData.participantIds,
        tournament_ids: formData.tournamentIds,
        season_type: formData.seasonType,
      };

      if (formData.seasonType === 'year') {
        payload.season_year = formData.seasonYear;
      } else if (formData.seasonType === 'season') {
        payload.season_year = `${formData.seasonFrom}/${formData.seasonTo}`;
      } else {
        payload.start_date = formData.startDate || null;
        payload.end_date = formData.endDate || null;
      }

      const updated = await leagueService.update(Number(id), payload);
      navigate(`/leagues/${updated.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  if (loadingLeague) return <div className="p-8 text-foreground">Wird geladen...</div>;
  if (!league) return <div className="p-8 text-foreground">Meisterschaft nicht gefunden.</div>;

  const filteredTournaments = tournaments.filter(t => t.mode === formData.tournamentMode);
  const showKoRounds = formData.tournamentMode === 'knockout' || formData.tournamentMode === 'combined';
  const showParticipationPoints = formData.tournamentMode === 'combined';
  const sel = "w-full min-h-10 px-3 py-2 text-base border border-border rounded-md bg-card text-foreground";

  return (
    <div className="p-8 bg-background min-h-screen text-foreground max-w-[1100px] mx-auto">
      <Button variant="secondary" onClick={() => navigate(`/leagues/${league.id}`)}>
        <ArrowLeft size={18} className="mr-2 align-middle" /> Zurück
      </Button>
      <h1 className="text-foreground my-6">Meisterschaft bearbeiten</h1>

      <form onSubmit={handleSubmit}>
        {/* Basisdaten */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">Basisdaten</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input name="name" value={formData.name} onChange={handleChange} placeholder="Name" required />
            <Textarea name="description" value={formData.description} onChange={handleChange} placeholder="Beschreibung" rows={3} />
            <div>
              <label className="block mb-2 font-semibold text-foreground">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={sel}>
                <option value="geplant">Geplant</option>
                <option value="laufend">Laufend</option>
                <option value="abgeschlossen">Abgeschlossen</option>
              </select>
            </div>
            <div>
              <label className="block mb-2 font-semibold text-foreground">Zeitraum</label>
              <div className="flex gap-4 mb-3">
                {(['year', 'dates', 'season'] as const).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="seasonType" value={t} checked={formData.seasonType === t} onChange={handleChange} />
                    <span className="text-sm">{t === 'year' ? 'Jahr' : t === 'dates' ? 'Zeitraum' : 'Saison'}</span>
                  </label>
                ))}
              </div>
              {formData.seasonType === 'year' && (
                <select name="seasonYear" value={formData.seasonYear} onChange={handleChange} className={sel}>
                  {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              )}
              {formData.seasonType === 'dates' && (
                <div className="grid grid-cols-2 gap-4">
                  <Input type="date" name="startDate" value={formData.startDate} onChange={handleChange} />
                  <Input type="date" name="endDate" value={formData.endDate} onChange={handleChange} />
                </div>
              )}
              {formData.seasonType === 'season' && (
                <div className="flex items-center gap-2">
                  <select name="seasonFrom" value={formData.seasonFrom} onChange={handleChange} className={sel}>
                    {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                  <span>/</span>
                  <select name="seasonTo" value={formData.seasonTo} onChange={handleChange} className={sel}>
                    {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Meisterschaftsmodus */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">Meisterschaftsmodus</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <div>
                <label className="block mb-2 font-semibold text-foreground">Modus</label>
                <select name="leagueMode" value={formData.leagueMode} onChange={handleChange} className={sel}>
                  <option value="liga">Liga</option>
                  <option value="masters">Masters</option>
                </select>
              </div>
              {formData.leagueMode === 'masters' && (
                <div>
                  <label className="block mb-2 font-semibold text-foreground">KO-Qualifikanten</label>
                  <Input type="number" name="mastersKoCount" value={formData.mastersKoCount} onChange={handleChange} min={2} max={64} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Turnier-Modus */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">Modus der Turniere</CardTitle></CardHeader>
          <CardContent>
            <select value={formData.tournamentMode} onChange={(e) => setFormData(prev => ({ ...prev, tournamentMode: e.target.value as TournamentModeForLeague }))} className={sel}>
              <option value="round_robin">Liga (Round Robin)</option>
              <option value="knockout">KO-Turnier</option>
              <option value="combined">Kombiniert</option>
            </select>
          </CardContent>
        </Card>

        {/* Punkteverteilung */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">Punkteverteilung pro Turnier</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-5">
              <h4 className="text-sm font-semibold mb-2">{formData.tournamentMode === 'round_robin' ? 'Platzierungen (Rang 1-X)' : 'Top-Platzierungen'}</h4>
              <div className="space-y-2">
                {formData.topPlacements.map((tp, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground w-10">{tp.rank}.</span>
                    <Input type="number" value={tp.rank} onChange={(e) => updateTop(idx, 'rank', Number(e.target.value))} min={1} className="w-20" />
                    <span className="text-sm text-muted-foreground">=</span>
                    <Input type="number" value={tp.points} onChange={(e) => updateTop(idx, 'points', Number(e.target.value))} min={0} className="w-24" />
                    <span className="text-sm text-muted-foreground">Pkt</span>
                    <button type="button" onClick={() => removeTop(idx)} className="text-destructive hover:text-destructive/80 p-1"><Trash size={16} /></button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={addTop} className="mt-2">+ Platz</Button>
            </div>

            {showKoRounds && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold mb-2">KO-Runden Punkte</h4>
                <div className="space-y-3">
                  {formData.koRounds.map((kr, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 p-3 border border-border rounded-md bg-muted/20">
                      <Input value={kr.label} onChange={(e) => updateKO(idx, 'label', e.target.value)} placeholder="z.B. Viertelfinale" className="w-40" />
                      <span className="text-xs text-muted-foreground">Rang</span>
                      <Input type="number" value={kr.fromRank} onChange={(e) => updateKO(idx, 'fromRank', Number(e.target.value))} min={1} className="w-16" />
                      <span className="text-xs text-muted-foreground">bis</span>
                      <Input type="number" value={kr.toRank} onChange={(e) => updateKO(idx, 'toRank', Number(e.target.value))} min={1} className="w-16" />
                      <span className="text-xs text-muted-foreground">=</span>
                      <Input type="number" value={kr.points} onChange={(e) => updateKO(idx, 'points', Number(e.target.value))} min={0} className="w-20" />
                      <span className="text-xs text-muted-foreground">Pkt</span>
                      <button type="button" onClick={() => removeKORound(idx)} className="text-destructive hover:text-destructive/80 p-1"><Trash size={16} /></button>
                    </div>
                  ))}
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addKORound} className="mt-2">+ KO-Runde</Button>
              </div>
            )}

            {showParticipationPoints && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Teilnahme-Punkte</h4>
                <div className="flex items-center gap-3">
                  <Input type="number" value={formData.participationPoints} onChange={(e) => setFormData(prev => ({ ...prev, participationPoints: Number(e.target.value) }))} min={0} className="w-24" />
                  <span className="text-sm text-muted-foreground">Punkte</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Turniere + Teilnehmer */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle className="mt-0">Turniere</CardTitle></CardHeader>
            <CardContent>
              {filteredTournaments.length === 0 ? (
                <span className="text-muted-foreground">Keine passenden Turniere vorhanden.</span>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {filteredTournaments.map(t => (
                    <label key={t.id} className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={formData.tournamentIds.includes(t.id)} onChange={() => toggleId(t.id, 'tournamentIds')} />
                      {t.name} <span className="text-xs text-muted-foreground ml-1">({t.status})</span>
                    </label>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="mt-0">Teilnehmer</CardTitle></CardHeader>
            <CardContent>
              {participants.length === 0 ? (
                <span className="text-muted-foreground">Keine Teilnehmer.</span>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFormData(prev => ({ ...prev, participantIds: participants.map(p => p.id) }))}>Alle</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setFormData(prev => ({ ...prev, participantIds: [] }))}>Keine</Button>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {participants.map(p => (
                      <label key={p.id} className="flex items-center gap-2 mb-2">
                        <input type="checkbox" checked={formData.participantIds.includes(p.id)} onChange={() => toggleId(p.id, 'participantIds')} />
                        {p.first_name} {p.last_name}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {error && <div className="text-destructive mt-4">{error}</div>}
        <div className="mt-6">
          <Button type="submit" disabled={loading}>{loading ? 'Speichern...' : 'Änderungen speichern'}</Button>
        </div>
      </form>
    </div>
  );
}
