// Tournament Overall Schedule Content (Gesamtspielplan)
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { matchService, GroupMatch } from '../../services/matchService';
import { groupService, Group } from '../../services/groupService';
import { participantService } from '../../services/participantService';
import { locationService } from '../../services/locationService';
import { Tournament, Participant } from '../../types';
import { theme } from '../../theme/theme';
import { Button } from '../ui';

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

  if (loading) return <div style={{ color: theme.colors.text.secondary }}>Wird geladen...</div>;

  return (
    <div>
      {matches.length === 0 ? (
        <p style={{ color: theme.colors.text.secondary }}>Noch keine Spiele vorhanden.</p>
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
            <div key={round} style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: theme.colors.text.primary, marginBottom: '0.75rem' }}>
                Gesamtrunde {round}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: theme.colors.background.secondary }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Gruppe</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spielfeld</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ergebnis</th>
                      {canEdit && <th style={{ padding: '0.75rem', textAlign: 'left' }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {roundMatches.map((match, idx) => {
                      const isEditing = editingMatchId === match.id;
                      return (
                        <tr key={match.id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}` }}>
                          <td style={{ padding: '0.75rem' }}>{groupNameById[match.group_id] || `#${match.group_id}`}</td>
                          <td style={{ padding: '0.75rem' }}>#{idx + 1}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {match.spielfeld_id ? (spielfeldIdToName[match.spielfeld_id] ?? `#${match.spielfeld_id}`) : '–'}
                          </td>
                          <td style={{ padding: '0.75rem' }}>{formatParticipant(match.player1_id)}</td>
                          <td style={{ padding: '0.75rem' }}>{formatParticipant(match.player2_id)}</td>
                          <td style={{ padding: '0.75rem' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm(prev => ({ ...prev, score1: e.target.value }))}
                                  style={{ width: '60px', padding: '0.25rem' }}
                                />
                                :
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm(prev => ({ ...prev, score2: e.target.value }))}
                                  style={{ width: '60px', padding: '0.25rem' }}
                                />
                              </div>
                            ) : (
                              `${match.score1 ?? '–'} : ${match.score2 ?? '–'}`
                            )}
                          </td>
                          {canEdit && (
                            <td style={{ padding: '0.75rem' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <Button onClick={() => saveEdit(match.id)} variant="success" style={{ padding: '0.35rem 0.5rem' }}>
                                    Speichern
                                  </Button>
                                  <Button onClick={cancelEdit} variant="secondary" style={{ padding: '0.35rem 0.5rem' }}>
                                    Abbrechen
                                  </Button>
                                </div>
                              ) : (
                                <Button onClick={() => startEdit(match)} variant="info" style={{ padding: '0.35rem 0.5rem' }}>
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
