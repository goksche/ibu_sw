// Tournament Overall Schedule Content (Gesamtspielplan)
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { matchService, GroupMatch } from '../../services/matchService';
import { groupService, Group } from '../../services/groupService';
import { participantService } from '../../services/participantService';
import { locationService } from '../../services/locationService';
import { Tournament, Participant } from '../../types';
import { Button } from '../ui/Button';

interface TournamentOverallScheduleContentProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentOverallScheduleContent({ tournamentId, tournament }: TournamentOverallScheduleContentProps) {
  const { canEdit } = useAuth();
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatchId, setEditingMatchId] = useState<number | null>(null);
  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });
  const [spielfeldIdToName, setSpielfeldIdToName] = useState<Record<number, string>>({});

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

  const rounds = useMemo(() => {
    const unique = Array.from(new Set(matches.map(m => m.round)));
    return unique.sort((a, b) => a - b);
  }, [matches]);

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

  if (loading) return <div className="text-muted-foreground">Wird geladen...</div>;

  return (
    <div>
      {matches.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Spiele vorhanden.</p>
      ) : (
        rounds.map((round) => {
          const roundMatches = matches
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
