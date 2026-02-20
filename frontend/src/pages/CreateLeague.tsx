import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ArrowLeft, Trash } from 'phosphor-react';
import { participantService } from '../services/participantService';
import { tournamentService } from '../services/tournamentService';
import { locationService } from '../services/locationService';
import { leagueService } from '../services/leagueService';
import { Participant, Tournament, Location, PlacementPointsSchema, TournamentModeForLeague } from '../types';

interface TopEntry { rank: number; points: number; }
interface KORoundEntry { label: string; fromRank: number; toRank: number; points: number; }

const PRESETS: Record<string, { top: TopEntry[]; koRounds: KORoundEntry[]; participationPoints: number }> = {
  ko_standard: {
    top: [{ rank: 1, points: 30 }, { rank: 2, points: 24 }, { rank: 3, points: 18 }, { rank: 4, points: 15 }],
    koRounds: [
      { label: 'Viertelfinale', fromRank: 5, toRank: 8, points: 8 },
      { label: 'Achtelfinale', fromRank: 9, toRank: 16, points: 4 },
    ],
    participationPoints: 2,
  },
  liga_f1: {
    top: [
      { rank: 1, points: 25 }, { rank: 2, points: 18 }, { rank: 3, points: 15 },
      { rank: 4, points: 12 }, { rank: 5, points: 10 }, { rank: 6, points: 8 },
      { rank: 7, points: 6 }, { rank: 8, points: 4 }, { rank: 9, points: 2 }, { rank: 10, points: 1 },
    ],
    koRounds: [],
    participationPoints: 0,
  },
  liga_linear: {
    top: Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, points: 10 - i })),
    koRounds: [],
    participationPoints: 0,
  },
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => CURRENT_YEAR - 1 + i);

export default function CreateLeague() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [tournamentSource, setTournamentSource] = useState<'existing' | 'auto'>('existing');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    seasonType: 'year' as 'year' | 'dates' | 'season',
    seasonYear: String(CURRENT_YEAR),
    seasonFrom: String(CURRENT_YEAR),
    seasonTo: String(CURRENT_YEAR + 1),
    startDate: '',
    endDate: '',
    leagueMode: 'liga' as 'liga' | 'masters',
    mastersKoCount: 8,
    tournamentMode: 'combined' as TournamentModeForLeague,
    // Punkteverteilung
    topPlacements: PRESETS.ko_standard.top.map(t => ({ ...t })),
    koRounds: PRESETS.ko_standard.koRounds.map(k => ({ ...k })),
    participationPoints: PRESETS.ko_standard.participationPoints,
    // Turnier-Settings (für Auto-Generierung)
    autoTournamentCount: 5,
    tournamentNames: ['', '', '', '', ''] as string[],
    groupsCount: 4,
    groupDistribution: 'random' as 'random' | 'seeded',
    leagueScoringSystem: 'points' as 'points' | 'difference',
    tieBreakingRules: ['wins', 'diff', 'goals_for'] as string[],
    leagueVariant: 'classic' as 'classic' | 'double' | 'multiple',
    leagueRoundsMultiplier: 2,
    koStartRound: '' as string,
    koStructure: '' as string,
    koDrawMethod: '' as string,
    koDistribution: 'random_first_round' as string,
    koBlockSameGroup: true,
    koBlockSamePosition: false,
    koThirdPlaceMatch: false,
    koRandomSeed: null as number | null,
    locationId: null as number | null,
    spielfeldAssignmentMode: 'random' as string,
    // IDs
    participantIds: [] as number[],
    tournamentIds: [] as number[],
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pList, tList, lList] = await Promise.all([
        participantService.getAll(),
        tournamentService.getAll(),
        locationService.getAll().catch(() => []),
      ]);
      setParticipants(pList);
      setTournaments(tList);
      setLocations(lList);
    } catch (err) {
      console.warn('Daten konnten nicht geladen werden.', err);
    }
  };

  // Update presets when tournament mode changes
  useEffect(() => {
    if (formData.tournamentMode === 'round_robin') {
      applyPreset('liga_f1');
    } else if (formData.tournamentMode === 'knockout') {
      applyPreset('ko_standard');
    } else {
      applyPreset('ko_standard');
    }
  }, [formData.tournamentMode]);

  // Update tournament names array when count changes
  useEffect(() => {
    setFormData(prev => {
      const count = prev.autoTournamentCount;
      const names = [...prev.tournamentNames];
      while (names.length < count) names.push('');
      return { ...prev, tournamentNames: names.slice(0, count) };
    });
  }, [formData.autoTournamentCount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const toggleId = (id: number, key: 'participantIds' | 'tournamentIds') => {
    setFormData(prev => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
    });
  };

  // Punkteverteilung helpers
  const updateTop = (idx: number, field: 'rank' | 'points', value: number) => {
    setFormData(prev => {
      const updated = [...prev.topPlacements];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, topPlacements: updated };
    });
  };
  const addTop = () => {
    setFormData(prev => {
      const next = prev.topPlacements.length > 0 ? Math.max(...prev.topPlacements.map(t => t.rank)) + 1 : 1;
      return { ...prev, topPlacements: [...prev.topPlacements, { rank: next, points: 0 }] };
    });
  };
  const removeTop = (idx: number) => setFormData(prev => ({ ...prev, topPlacements: prev.topPlacements.filter((_, i) => i !== idx) }));

  const updateKO = (idx: number, field: keyof KORoundEntry, value: string | number) => {
    setFormData(prev => {
      const updated = [...prev.koRounds];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, koRounds: updated };
    });
  };
  const addKORound = () => {
    const lastTo = formData.koRounds.length > 0 ? formData.koRounds[formData.koRounds.length - 1].toRank : (formData.topPlacements.length > 0 ? Math.max(...formData.topPlacements.map(t => t.rank)) : 4);
    setFormData(prev => ({ ...prev, koRounds: [...prev.koRounds, { label: '', fromRank: lastTo + 1, toRank: lastTo * 2, points: 0 }] }));
  };
  const removeKORound = (idx: number) => setFormData(prev => ({ ...prev, koRounds: prev.koRounds.filter((_, i) => i !== idx) }));

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (!preset) return;
    setFormData(prev => ({
      ...prev,
      topPlacements: preset.top.map(t => ({ ...t })),
      koRounds: preset.koRounds.map(k => ({ ...k })),
      participationPoints: preset.participationPoints,
    }));
  };

  const toggleTieBreakingRule = (rule: string) => {
    setFormData(prev => {
      if (rule === 'decision_match') {
        return { ...prev, tieBreakingRules: ['decision_match'] };
      }
      const filtered = prev.tieBreakingRules.filter(r => r !== 'decision_match');
      if (filtered.includes(rule)) {
        return { ...prev, tieBreakingRules: filtered.filter(r => r !== rule) };
      }
      return { ...prev, tieBreakingRules: [...filtered, rule] };
    });
  };

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

  const buildAutoSettings = () => {
    const s: Record<string, any> = {
      tournament_names: formData.tournamentNames,
      location_id: formData.locationId,
    };
    const mode = formData.tournamentMode;
    const hasGroup = mode === 'round_robin' || mode === 'combined';
    const hasKo = mode === 'knockout' || mode === 'combined';

    if (hasGroup) {
      s.groups_count = Number(formData.groupsCount);
      s.group_distribution = formData.groupDistribution;
      s.league_scoring_system = formData.leagueScoringSystem;
      s.tie_breaking_rules = formData.tieBreakingRules;
      s.league_variant = formData.leagueVariant;
      if (formData.leagueVariant === 'multiple') s.league_rounds_multiplier = Number(formData.leagueRoundsMultiplier);
      s.spielfeld_assignment_mode = formData.spielfeldAssignmentMode;
    }
    if (hasKo) {
      if (formData.koStartRound) s.ko_start_round = formData.koStartRound;
      if (formData.koStructure) s.ko_structure = formData.koStructure;
      if (formData.koDrawMethod) s.ko_draw_method = formData.koDrawMethod;
      s.ko_distribution = formData.koDistribution;
      s.ko_third_place_match = formData.koThirdPlaceMatch;
      if (hasGroup) {
        s.ko_block_same_group = formData.koBlockSameGroup;
        s.ko_block_same_position = formData.koBlockSamePosition;
      }
      if (formData.koRandomSeed) s.ko_random_seed = formData.koRandomSeed;
    }
    return s;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        league_mode: formData.leagueMode,
        tournament_mode: formData.tournamentMode,
        placement_points: buildPlacementPoints(),
        masters_ko_count: formData.leagueMode === 'masters' ? Number(formData.mastersKoCount) : null,
        participant_ids: formData.participantIds,
        season_type: formData.seasonType,
        scoring_schema: null,
        mode_presets: null,
      };

      if (formData.seasonType === 'year') {
        payload.season_year = formData.seasonYear;
      } else if (formData.seasonType === 'season') {
        payload.season_year = `${formData.seasonFrom}/${formData.seasonTo}`;
      } else {
        payload.start_date = formData.startDate || null;
        payload.end_date = formData.endDate || null;
      }

      if (tournamentSource === 'existing') {
        payload.tournament_ids = formData.tournamentIds;
        payload.auto_tournament_count = 0;
      } else {
        payload.tournament_ids = [];
        payload.auto_tournament_count = Number(formData.autoTournamentCount);
        payload.auto_tournament_mode = formData.tournamentMode;
        payload.auto_tournament_settings = buildAutoSettings();
      }

      const league = await leagueService.create(payload);
      if (tournamentSource === 'auto' && Number(formData.autoTournamentCount) > 0) {
        await leagueService.generateTournaments(league.id);
      }
      navigate(`/leagues/${league.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Fehler beim Erstellen der Meisterschaft');
    } finally {
      setLoading(false);
    }
  };

  const filteredTournaments = tournaments.filter(t => t.mode === formData.tournamentMode);
  const showGroupSettings = formData.tournamentMode === 'round_robin' || formData.tournamentMode === 'combined';
  const showKoSettings = formData.tournamentMode === 'knockout' || formData.tournamentMode === 'combined';
  const showParticipationPoints = formData.tournamentMode === 'combined';
  const showKoRounds = formData.tournamentMode === 'knockout' || formData.tournamentMode === 'combined';

  const sel = "w-full min-h-10 px-3 py-2 text-base border border-border rounded-md bg-card text-foreground";
  const tieLabels: Record<string, string> = { wins: 'Siege', diff: 'Differenz', goals_for: 'LF', direct_encounter: 'Direktbegegnung', decision_match: 'Entscheidungsspiel' };

  return (
    <div className="p-8 bg-background min-h-screen text-foreground max-w-[1100px] mx-auto">
      <Button variant="secondary" onClick={() => navigate('/leagues')}>
        <ArrowLeft size={18} className="mr-2 align-middle" /> Zurück
      </Button>
      <h1 className="text-foreground my-6">Neue Meisterschaft anlegen</h1>

      <form onSubmit={handleSubmit}>
        {/* 1. Basisdaten */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">1. Basisdaten</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input name="name" value={formData.name} onChange={handleChange} placeholder="Name der Meisterschaft" required />
            <Textarea name="description" value={formData.description} onChange={handleChange} placeholder="Beschreibung (optional)" rows={3} />

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
                  <span className="text-muted-foreground">/</span>
                  <select name="seasonTo" value={formData.seasonTo} onChange={handleChange} className={sel}>
                    {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Meisterschaftsmodus */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">2. Meisterschaftsmodus</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <div>
                <label className="block mb-2 font-semibold text-foreground">Modus</label>
                <select name="leagueMode" value={formData.leagueMode} onChange={handleChange} className={sel}>
                  <option value="liga">Liga (nur Punktewertung)</option>
                  <option value="masters">Masters (Liga + finales KO-Turnier)</option>
                </select>
              </div>
              {formData.leagueMode === 'masters' && (
                <div>
                  <label className="block mb-2 font-semibold text-foreground">Anzahl KO-Qualifikanten</label>
                  <Input type="number" name="mastersKoCount" value={formData.mastersKoCount} onChange={handleChange} min={2} max={64} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Modus der Turniere */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="mt-0">3. Modus der Turniere</CardTitle>
            <CardDescription>Bestimmt den Turnier-Typ und die Punkteverteilung.</CardDescription>
          </CardHeader>
          <CardContent>
            <select name="tournamentMode" value={formData.tournamentMode} onChange={(e) => setFormData(prev => ({ ...prev, tournamentMode: e.target.value as TournamentModeForLeague }))} className={sel}>
              <option value="round_robin">Liga (Round Robin)</option>
              <option value="knockout">KO-Turnier</option>
              <option value="combined">Kombiniert (Gruppenphase + KO)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              {formData.tournamentMode === 'round_robin' && 'Alle Turniere sind Liga-Turniere. Punkteverteilung nach Rang 1-X.'}
              {formData.tournamentMode === 'knockout' && 'Alle Turniere sind KO-Turniere. Punkteverteilung für Top 1-4 + KO-Runden.'}
              {formData.tournamentMode === 'combined' && 'Alle Turniere haben Gruppenphase + KO. Punkteverteilung für Top 1-4 + KO-Runden + Teilnahme-Punkte.'}
            </p>
          </CardContent>
        </Card>

        {/* 4. Punkteverteilung */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="mt-0">4. Punkteverteilung pro Turnier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              {formData.tournamentMode === 'round_robin' ? (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset('liga_f1')}>F1-Schema</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset('liga_linear')}>Linear (10-1)</Button>
                </>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={() => applyPreset('ko_standard')}>Standard KO</Button>
              )}
            </div>

            {/* Top-Platzierungen */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold mb-2">
                {formData.tournamentMode === 'round_robin' ? 'Platzierungen (Rang 1-X)' : 'Top-Platzierungen (1.-4.)'}
              </h4>
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

            {/* KO-Runden */}
            {showKoRounds && (
              <div className="mb-5">
                <h4 className="text-sm font-semibold mb-2">KO-Runden Punkte</h4>
                <p className="text-xs text-muted-foreground mb-3">Punkte für Teilnehmer einer KO-Runde (z.B. Viertelfinale = Rang 5-8).</p>
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

            {/* Teilnahme-Punkte */}
            {showParticipationPoints && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Teilnahme-Punkte</h4>
                <p className="text-xs text-muted-foreground mb-2">Punkte für Teilnehmer, die in der Gruppenphase ausscheiden.</p>
                <div className="flex items-center gap-3">
                  <Input type="number" value={formData.participationPoints} onChange={(e) => setFormData(prev => ({ ...prev, participationPoints: Number(e.target.value) }))} min={0} className="w-24" />
                  <span className="text-sm text-muted-foreground">Punkte</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. Turniere */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">5. Turniere</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={tournamentSource === 'existing'} onChange={() => setTournamentSource('existing')} />
                <span className="text-sm font-medium">Bestehende Turniere wählen</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={tournamentSource === 'auto'} onChange={() => setTournamentSource('auto')} />
                <span className="text-sm font-medium">Turniere automatisch generieren</span>
              </label>
            </div>

            {tournamentSource === 'existing' ? (
              filteredTournaments.length === 0 ? (
                <span className="text-muted-foreground">Keine passenden Turniere ({formData.tournamentMode === 'round_robin' ? 'Liga' : formData.tournamentMode === 'knockout' ? 'KO' : 'Kombi'}) vorhanden.</span>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  {filteredTournaments.map(t => (
                    <label key={t.id} className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={formData.tournamentIds.includes(t.id)} onChange={() => toggleId(t.id, 'tournamentIds')} />
                      {t.name} <span className="text-xs text-muted-foreground ml-1">({t.status})</span>
                    </label>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-6">
                {/* Anzahl + Namen */}
                <div>
                  <label className="block mb-2 font-semibold text-foreground">Anzahl Turniere</label>
                  <Input type="number" name="autoTournamentCount" value={formData.autoTournamentCount} onChange={(e) => setFormData(prev => ({ ...prev, autoTournamentCount: Number(e.target.value) }))} min={1} max={20} className="w-32" />
                </div>
                <div>
                  <label className="block mb-2 font-semibold text-foreground">Turnier-Namen</label>
                  <p className="text-xs text-muted-foreground mb-2">Leer lassen = automatischer Name "{formData.name} - Turnier X"</p>
                  <div className="space-y-2">
                    {formData.tournamentNames.map((tn, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                        <Input value={tn} onChange={(e) => {
                          setFormData(prev => {
                            const updated = [...prev.tournamentNames];
                            updated[idx] = e.target.value;
                            return { ...prev, tournamentNames: updated };
                          });
                        }} placeholder={`${formData.name || 'Meisterschaft'} – Turnier ${idx + 1}`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spielort */}
                <div>
                  <label className="block mb-2 font-semibold text-foreground">Spielort (optional)</label>
                  <select value={formData.locationId ?? ''} onChange={(e) => setFormData(prev => ({ ...prev, locationId: e.target.value ? Number(e.target.value) : null }))} className={sel}>
                    <option value="">— Kein Spielort —</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>

                {/* Gruppenphase-Settings */}
                {showGroupSettings && (
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="text-sm font-semibold mb-3">Gruppenphase-Einstellungen</h4>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                      <div>
                        <label className="block mb-1 text-sm font-medium">Anzahl Gruppen</label>
                        <Input type="number" value={formData.groupsCount} onChange={(e) => setFormData(prev => ({ ...prev, groupsCount: Number(e.target.value) }))} min={1} />
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium">Verteilung</label>
                        <select value={formData.groupDistribution} onChange={(e) => setFormData(prev => ({ ...prev, groupDistribution: e.target.value as any }))} className={sel}>
                          <option value="random">Zufällig</option>
                          <option value="seeded">Gesetzt</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium">Wertungssystem</label>
                        <select value={formData.leagueScoringSystem} onChange={(e) => setFormData(prev => ({ ...prev, leagueScoringSystem: e.target.value as any }))} className={sel}>
                          <option value="points">Punkte (3/1/0)</option>
                          <option value="difference">Differenz</option>
                        </select>
                      </div>
                      {formData.tournamentMode === 'round_robin' && (
                        <div>
                          <label className="block mb-1 text-sm font-medium">Liga-Variante</label>
                          <select value={formData.leagueVariant} onChange={(e) => setFormData(prev => ({ ...prev, leagueVariant: e.target.value as any }))} className={sel}>
                            <option value="classic">Klassisch</option>
                            <option value="double">Doppelt</option>
                            <option value="multiple">Mehrfach</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {formData.locationId && (
                      <div className="mt-3">
                        <label className="block mb-1 text-sm font-medium">Spielfeld-Zuweisung</label>
                        <select value={formData.spielfeldAssignmentMode} onChange={(e) => setFormData(prev => ({ ...prev, spielfeldAssignmentMode: e.target.value }))} className={sel}>
                          <option value="random">Fair (rundenbasiert)</option>
                          <option value="group_fixed">Fix pro Gruppe</option>
                          <option value="group_random">Zufällig pro Gruppe</option>
                        </select>
                      </div>
                    )}
                    <div className="mt-3">
                      <label className="block mb-1 text-sm font-medium">Gleichstandsregeln</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(tieLabels).map(([key, label]) => {
                          const checked = formData.tieBreakingRules.includes(key);
                          const isDecision = key === 'decision_match';
                          const hasDecision = formData.tieBreakingRules.includes('decision_match');
                          const disabled = (isDecision && formData.tieBreakingRules.some(r => r !== 'decision_match')) || (!isDecision && hasDecision);
                          return (
                            <label key={key} className={`flex items-center gap-1 text-sm ${disabled ? 'opacity-40' : 'cursor-pointer'}`}>
                              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleTieBreakingRule(key)} />
                              {label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* KO-Phase-Settings */}
                {showKoSettings && (
                  <div className="p-4 border border-border rounded-lg">
                    <h4 className="text-sm font-semibold mb-3">KO-Phase-Einstellungen</h4>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                      {formData.tournamentMode === 'combined' && (
                        <div>
                          <label className="block mb-1 text-sm font-medium">KO-Start-Runde</label>
                          <select value={formData.koStartRound} onChange={(e) => setFormData(prev => ({ ...prev, koStartRound: e.target.value }))} className={sel}>
                            <option value="">-- Wählen --</option>
                            <option value="round_of_32">Runde der 32</option>
                            <option value="round_of_16">Achtelfinale (16)</option>
                            <option value="quarterfinal">Viertelfinale (8)</option>
                            <option value="semifinal">Halbfinale (4)</option>
                            <option value="final">Finale (2)</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block mb-1 text-sm font-medium">KO-Struktur</label>
                        <select value={formData.koStructure} onChange={(e) => setFormData(prev => ({ ...prev, koStructure: e.target.value }))} className={sel}>
                          <option value="">-- Wählen --</option>
                          <option value="single_elimination">Einfach-KO</option>
                          <option value="single_elimination_with_third">Einfach-KO + Spiel um Platz 3</option>
                          <option value="consolation_bracket">Trostturnier</option>
                          <option value="double_elimination">Doppel-KO</option>
                        </select>
                      </div>
                      <div>
                        <label className="block mb-1 text-sm font-medium">Auslosungsmethode</label>
                        <select value={formData.koDrawMethod} onChange={(e) => setFormData(prev => ({ ...prev, koDrawMethod: e.target.value }))} className={sel}>
                          <option value="">-- Wählen --</option>
                          {formData.tournamentMode === 'knockout' ? (
                            <>
                              <option value="full_random">Vollzufällig</option>
                              <option value="pot_system">Topf-System</option>
                              <option value="manual">Manuell</option>
                            </>
                          ) : (
                            <>
                              <option value="fixed_cross">Feste Kreuzpaarung</option>
                              <option value="same_position_cross">Platzgleiches Kreuzen</option>
                              <option value="overall_seeding">Gesamt-Seeding</option>
                              <option value="full_random">Vollzufällig</option>
                              <option value="manual">Manuell</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={formData.koThirdPlaceMatch} onChange={(e) => setFormData(prev => ({ ...prev, koThirdPlaceMatch: e.target.checked }))} />
                        Spiel um Platz 3
                      </label>
                      {showGroupSettings && (
                        <>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={formData.koBlockSameGroup} onChange={(e) => setFormData(prev => ({ ...prev, koBlockSameGroup: e.target.checked }))} />
                            Keine Paarung gleiche Gruppe
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={formData.koBlockSamePosition} onChange={(e) => setFormData(prev => ({ ...prev, koBlockSamePosition: e.target.checked }))} />
                            Keine gleiche Platzierung
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 6. Teilnehmer */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="mt-0">6. Teilnehmer</CardTitle></CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <span className="text-muted-foreground">Keine Teilnehmer vorhanden.</span>
            ) : (
              <>
                <div className="flex gap-2 mb-3">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setFormData(prev => ({ ...prev, participantIds: participants.map(p => p.id) }))}>Alle auswählen</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setFormData(prev => ({ ...prev, participantIds: [] }))}>Alle abwählen</Button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {participants.map(p => (
                    <label key={p.id} className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={formData.participantIds.includes(p.id)} onChange={() => toggleId(p.id, 'participantIds')} />
                      {p.first_name} {p.last_name}
                    </label>
                  ))}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">{formData.participantIds.length} von {participants.length} ausgewählt</div>
              </>
            )}
          </CardContent>
        </Card>

        {error && <div className="text-destructive mt-4">{error}</div>}
        <div className="mt-6">
          <Button type="submit" disabled={loading}>{loading ? 'Speichern...' : 'Meisterschaft erstellen'}</Button>
        </div>
      </form>
    </div>
  );
}
