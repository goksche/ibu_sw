// Tournament Overall Schedule Content (Gesamtspielplan)
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { matchService, GroupMatch } from '../../services/matchService';
import { groupService, Group } from '../../services/groupService';
import { participantService } from '../../services/participantService';
import { locationService } from '../../services/locationService';
import { tournamentService } from '../../services/tournamentService';
import { Tournament, Participant } from '../../types';
import { Button, Input } from '../ui';

interface TournamentOverallScheduleContentProps {
  tournamentId: number;
  tournament: Tournament;
  /** Von TournamentDetail gesteuert: Suche in der Toolbar (sichtbar auf Server B / gleiche Zeile wie Ansichts-Umschalter) */
  scheduleSearch?: string;
  onScheduleSearchChange?: (value: string) => void;
}

export default function TournamentOverallScheduleContent({
  tournamentId,
  tournament,
  scheduleSearch: scheduleSearchProp,
  onScheduleSearchChange,
}: TournamentOverallScheduleContentProps) {
  const { t } = useTranslation();
  const { canEdit } = useAuth();
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });
  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});
  const [simMinScore, setSimMinScore] = useState(0);
  const [simMaxScore, setSimMaxScore] = useState(5);
  const [simAllowDraws, setSimAllowDraws] = useState(true);
  const [simOverwrite, setSimOverwrite] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [internalScheduleSearch, setInternalScheduleSearch] = useState('');
  const controlledFromParent =
    typeof onScheduleSearchChange === 'function' && typeof scheduleSearchProp === 'string';
  const scheduleSearch = controlledFromParent ? scheduleSearchProp! : internalScheduleSearch;

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (!tournament.location_id) {
      setSpielfeldIdToName({});
      return;
    }
    const loadLocations = async () => {
      try {
        const locations = await locationService.getAll();
        const loc = locations.find(l => l.id === tournament.location_id);
        if (loc?.spielfelder) {
          const map: Record<number, string> = {};
          loc.spielfelder.forEach(s => { map[s.id] = s.name; });
          setSpielfeldIdToName(map);
        } else {
          setSpielfeldIdToName({});
        }
      } catch {
        setSpielfeldIdToName({});
      }
    };
    loadLocations();
  }, [tournament.location_id]);

  const loadData = async () => {
    try {
      const [groupsData, matchesData] = await Promise.all([
        groupService.getGroups(tournamentId),
        matchService.getGroupMatches(tournamentId)
      ]);
      setGroups(groupsData);
      setMatches(matchesData);

      try {
        const participantsData = await participantService.getTournamentParticipants(tournamentId);
        setParticipants(participantsData);
      } catch {
        const participantsData = await participantService.getAll();
        setParticipants(participantsData);
      }
    } catch (err) {
      console.error('Failed to load overall schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const groupNameById = useMemo(() => {
    return groups.reduce<Record<number, string>>((acc, g) => {
      acc[g.id] = g.name;
      return acc;
    }, {});
  }, [groups]);

  const participantById = useMemo(() => {
    return participants.reduce<Record<number, Participant>>((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {});
  }, [participants]);

  const scheduleSearchNorm = scheduleSearch.trim().toLowerCase();

  const matchesForDisplay = useMemo(() => {
    if (!scheduleSearchNorm) return matches;
    return matches.filter((m) => {
      const g = (groupNameById[m.group_id] || '').toLowerCase();
      const p1 = m.player1_id
        ? `${participantById[m.player1_id]?.first_name ?? ''} ${participantById[m.player1_id]?.last_name ?? ''}`.trim().toLowerCase()
        : '';
      const p2 = m.player2_id
        ? `${participantById[m.player2_id]?.first_name ?? ''} ${participantById[m.player2_id]?.last_name ?? ''}`.trim().toLowerCase()
        : '';
      const sf = m.spielfeld_id ? (spielfeldIdToName[m.spielfeld_id] || '').toLowerCase() : '';
      const hay = `${g} ${p1} ${p2} ${sf} ${m.round}`;
      return hay.includes(scheduleSearchNorm);
    });
  }, [matches, scheduleSearchNorm, groupNameById, participantById, spielfeldIdToName]);

  const rounds = useMemo(() => {
    const unique = Array.from(new Set(matchesForDisplay.map(m => m.round)));
    return unique.sort((a, b) => a - b);
  }, [matchesForDisplay]);

  const formatParticipant = (id: number | null) => {
    if (!id) return '—';
    const p = participantById[id];
    if (!p) return `#${id}`;
    return `${p.first_name} ${p.last_name}`;
  };

  const startEdit = (match: GroupMatch) => {
    setEditingMatchId(match.id);
    setScoreForm({
      score1: match.score1 !== null && match.score1 !== undefined ? String(match.score1) : '',
      score2: match.score2 !== null && match.score2 !== undefined ? String(match.score2) : ''
    });
  };

  const cancelEdit = () => {
    setEditingMatchId(null);
    setScoreForm({ score1: '', score2: '' });
  };

  const saveEdit = async (matchId: number) => {
    const score1 = scoreForm.score1 === '' ? null : Number(scoreForm.score1);
    const score2 = scoreForm.score2 === '' ? null : Number(scoreForm.score2);
    if ((score1 !== null && Number.isNaN(score1)) || (score2 !== null && Number.isNaN(score2))) {
      alert('Bitte gültige Zahlen eingeben.');
      return;
    }
    try {
      const updated = await matchService.updateGroupMatch(matchId, { score1, score2 });
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      cancelEdit();
    } catch (err) {
      console.error('Failed to update match:', err);
      alert('Fehler beim Speichern des Ergebnisses');
    }
  };

  const getRandomScorePair = (minScore: number, maxScore: number, allowDraws: boolean) => {
    let score1 = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
    let score2 = Math.floor(Math.random() * (maxScore - minScore + 1)) + minScore;
    if (!allowDraws && score1 === score2) {
      if (score2 < maxScore) score2 += 1;
      else if (score1 > minScore) score1 -= 1;
      else score2 = Math.min(maxScore, score2 + 1);
    }
    return { score1, score2 };
  };

  const handleSimulateOverall = async () => {
    if (!canEdit) return;
    if (simMinScore < 0 || simMaxScore < 0 || simMinScore > simMaxScore) {
      alert('Ungültiger Ergebnisbereich. Bitte Min/Max prüfen.');
      return;
    }
    setSimLoading(true);
    try {
      const result = await tournamentService.simulatePhase(tournamentId, {
        phase: 'group',
        min_score: simMinScore,
        max_score: simMaxScore,
        allow_draws: simAllowDraws,
        overwrite_existing: simOverwrite,
      });
      await loadData();
      alert(`Gesamtspielplan simuliert.\nAktualisiert: ${result.updated_matches}\nÜbersprungen: ${result.skipped_matches}`);
    } catch (err: any) {
      // Fallback for backends without simulation endpoint
      try {
        let updated = 0;
        let skipped = 0;
        const currentMatches = await matchService.getGroupMatches(tournamentId);
        for (const match of currentMatches) {
          if (match.player1_id == null || match.player2_id == null) {
            skipped += 1;
            continue;
          }
          const alreadyScored = match.score1 != null || match.score2 != null;
          if (alreadyScored && !simOverwrite) {
            skipped += 1;
            continue;
          }
          const { score1, score2 } = getRandomScorePair(simMinScore, simMaxScore, simAllowDraws);
          await matchService.updateGroupMatch(match.id, { score1, score2 });
          updated += 1;
        }
        await loadData();
        alert(`Gesamtspielplan simuliert.\nAktualisiert: ${updated}\nÜbersprungen: ${skipped}\n(Fallback ohne Simulations-Endpoint)`);
      } catch (fallbackErr: any) {
        alert(fallbackErr?.response?.data?.detail || fallbackErr?.message || err?.response?.data?.detail || 'Simulation fehlgeschlagen');
      }
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) return <div className="text-muted-foreground">Wird geladen...</div>;

  return (
    <div>
      {!controlledFromParent && matches.length > 0 && (
        <div className="mb-4 rounded-lg border-2 border-primary/40 bg-muted px-3 py-2">
          <Input
            type="search"
            value={scheduleSearch}
            onChange={(e) => setInternalScheduleSearch(e.target.value)}
            placeholder={t('tournament.detail.overallScheduleSearchPlaceholder')}
            aria-label={t('common.search')}
            className="max-w-md border-border bg-background"
          />
        </div>
      )}
      {canEdit && matches.length > 0 && (
        <div className="mb-4 rounded-lg border border-border bg-muted p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-foreground">
              Min
              <input
                type="number"
                min={0}
                value={simMinScore}
                onChange={(e) => setSimMinScore(parseInt(e.target.value || '0', 10))}
                className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
              />
            </label>
            <label className="text-sm text-foreground">
              Max
              <input
                type="number"
                min={0}
                value={simMaxScore}
                onChange={(e) => setSimMaxScore(parseInt(e.target.value || '0', 10))}
                className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-foreground"
              />
            </label>
            <label className="text-sm text-foreground flex items-center gap-2">
              <input
                type="checkbox"
                checked={simAllowDraws}
                onChange={(e) => setSimAllowDraws(e.target.checked)}
              />
              Remis erlauben
            </label>
            <label className="text-sm text-foreground flex items-center gap-2">
              <input
                type="checkbox"
                checked={simOverwrite}
                onChange={(e) => setSimOverwrite(e.target.checked)}
              />
              Bestehende Resultate überschreiben
            </label>
            <Button
              onClick={handleSimulateOverall}
              variant="warning"
              disabled={simLoading}
              className="text-sm"
            >
              {simLoading ? 'Simulation läuft...' : 'Gesamtspielplan simulieren'}
            </Button>
          </div>
        </div>
      )}
      {matches.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Spiele vorhanden.</p>
      ) : matchesForDisplay.length === 0 && scheduleSearchNorm ? (
        <p className="text-muted-foreground">{t('tournament.detail.overallScheduleSearchEmpty')}</p>
      ) : (
        rounds.map((round) => {
          const roundMatches = matchesForDisplay
            .filter(m => m.round === round)
            .sort((a, b) => {
              if (a.match_no !== b.match_no) return a.match_no - b.match_no;
              const ga = groupNameById[a.group_id] || '';
              const gb = groupNameById[b.group_id] || '';
              if (ga !== gb) return ga.localeCompare(gb);
              return a.id - b.id;
            });

          return (
            <div key={round} className="mb-8">
              <h3 className="text-foreground mb-3">
                Gesamtrunde {round}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-3 text-left">Gruppe</th>
                      <th className="p-3 text-left">Spiel</th>
                      <th className="p-3 text-left">Spielfeld</th>
                      <th className="p-3 text-left">Spieler 1</th>
                      <th className="p-3 text-left">Spieler 2</th>
                      <th className="p-3 text-left">Ergebnis</th>
                      {canEdit && <th className="p-3 text-left"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {roundMatches.map((match, idx) => {
                      const isEditing = editingMatchId === match.id;
                      return (
                        <tr key={match.id} className="border-b border-border">
                          <td className="p-3">{groupNameById[match.group_id] || `#${match.group_id}`}</td>
                          <td className="p-3">#{idx + 1}</td>
                          <td className="p-3">
                            {match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '–'}
                          </td>
                          <td className="p-3">{formatParticipant(match.player1_id)}</td>
                          <td className="p-3">{formatParticipant(match.player2_id)}</td>
                          <td className="p-3">
                            {isEditing ? (
                              <div className="flex gap-2 items-center">
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm(prev => ({ ...prev, score1: e.target.value }))}
                                  className="w-[60px] p-1 h-8 rounded-md border border-input bg-background text-foreground text-sm"
                                />
                                :
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm(prev => ({ ...prev, score2: e.target.value }))}
                                  className="w-[60px] p-1 h-8 rounded-md border border-input bg-background text-foreground text-sm"
                                />
                              </div>
                            ) : (
                              `${match.score1 ?? '–'} : ${match.score2 ?? '–'}`
                            )}
                          </td>
                          {canEdit && (
                            <td className="p-3">
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button onClick={() => saveEdit(match.id)} variant="success" size="sm" className="px-2 py-1.5">
                                    Speichern
                                  </Button>
                                  <Button onClick={cancelEdit} variant="secondary" size="sm" className="px-2 py-1.5">
                                    Abbrechen
                                  </Button>
                                </div>
                              ) : (
                                <Button onClick={() => startEdit(match)} variant="info" size="sm" className="px-2 py-1.5">
                                  Bearbeiten
                                </Button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
