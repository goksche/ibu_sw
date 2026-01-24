// Tournament Matches Page - Display and Manage Group Matches
import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { tournamentService } from '../services/tournamentService';
import { groupService, GroupWithParticipants } from '../services/groupService';
import { matchService, GroupMatch } from '../services/matchService';
import { Tournament } from '../types';
import { useNavigate, useParams } from 'react-router-dom';

export default function TournamentMatches() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const tournamentId = id ? parseInt(id) : 0;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    if (tournamentId) {
      loadData();
    }
  }, [tournamentId, navigate]);

  const loadData = async () => {
    try {
      const [tournamentData, groupsData] = await Promise.all([
        tournamentService.getById(tournamentId),
        groupService.getGroups(tournamentId),
      ]);
      setTournament(tournamentData);
      
      const fullGroups = await Promise.all(
        groupsData.map(async (g) => await groupService.getGroup(g.id))
      );
      setGroups(fullGroups);
      
      if (fullGroups.length > 0 && !selectedGroupId) {
        setSelectedGroupId(fullGroups[0].id);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadMatches();
    }
  }, [selectedGroupId]);

  const loadMatches = async () => {
    if (!selectedGroupId) return;
    
    try {
      const matchesData = await matchService.getGroupMatches(tournamentId, selectedGroupId);
      setMatches(matchesData);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  };

  const handleEdit = (match: GroupMatch) => {
    setEditingMatch(match.id);
    setScoreForm({
      score1: match.score1?.toString() || '',
      score2: match.score2?.toString() || '',
    });
  };

  const handleSave = async (matchId: number) => {
    try {
      await matchService.updateGroupMatch(matchId, {
        score1: scoreForm.score1 ? parseInt(scoreForm.score1) : undefined,
        score2: scoreForm.score2 ? parseInt(scoreForm.score2) : undefined,
      });
      setEditingMatch(null);
      setScoreForm({ score1: '', score2: '' });
      loadMatches();
    } catch (err) {
      console.error('Failed to save match:', err);
      alert('Fehler beim Speichern des Ergebnisses');
    }
  };

  const handleCancel = () => {
    setEditingMatch(null);
    setScoreForm({ score1: '', score2: '' });
  };

  const getParticipantName = (participantId: number | null): string => {
    if (!participantId || !groups.length || !selectedGroupId) return '-';
    const group = groups.find(g => g.id === selectedGroupId);
    if (!group) return '-';
    const participant = group.participants.find(p => p.id === participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : '-';
  };

  if (loading) return <div style={{ padding: '2rem' }}>Wird geladen...</div>;
  if (!tournament) return <div style={{ padding: '2rem' }}>Turnier nicht gefunden.</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1>{tournament.name}</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Spiele und Ergebnisse</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}
            style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Gruppen
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '0.5rem 1rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Dashboard
          </button>
        </div>
      </div>

      {!tournament.has_group_phase && (
        <div style={{ padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', marginBottom: '2rem' }}>
          ⚠️ Dieses Turnier hat keine Gruppenphase konfiguriert.
        </div>
      )}

      {groups.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
          <p>Noch keine Gruppen vorhanden.</p>
          <button 
            onClick={() => navigate(`/tournaments/${tournamentId}/groups`)}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Gruppen erstellen
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Gruppe auswählen
            </label>
            <select
              value={selectedGroupId || ''}
              onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
              style={{ width: '100%', maxWidth: '300px', padding: '0.5rem', fontSize: '1rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.participants.length} Teilnehmer)
                </option>
              ))}
            </select>
          </div>

          {selectedGroup && (
            <>
              <h2>Gruppe: {selectedGroup.name}</h2>
              <div style={{ marginBottom: '1rem', color: '#666' }}>
                {selectedGroup.participants.length} Teilnehmer
              </div>

              {matches.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
                  <p>Noch keine Spiele vorhanden.</p>
                </div>
              ) : (
                <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#007bff', color: 'white' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Runde</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ergebnis</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches
                        .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no))
                        .map((match) => (
                        <tr key={match.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.75rem' }}>Runde {match.round}</td>
                          <td style={{ padding: '0.75rem' }}>Spiel {match.match_no}</td>
                          <td style={{ padding: '0.75rem' }}>{getParticipantName(match.player1_id)}</td>
                          <td style={{ padding: '0.75rem' }}>{getParticipantName(match.player2_id)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {editingMatch === match.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  style={{ width: '60px', padding: '0.25rem', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                  min="0"
                                />
                                <span>:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  style={{ width: '60px', padding: '0.25rem', textAlign: 'center', border: '1px solid #ddd', borderRadius: '4px' }}
                                  min="0"
                                />
                              </div>
                            ) : (
                              <span style={{ fontWeight: 'bold' }}>
                                {match.score1 !== null && match.score2 !== null 
                                  ? `${match.score1} : ${match.score2}`
                                  : '- : -'
                                }
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {editingMatch === match.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <button
                                  onClick={() => handleSave(match.id)}
                                  style={{ padding: '0.25rem 0.75rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={handleCancel}
                                  style={{ padding: '0.25rem 0.75rem', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(match)}
                                style={{ padding: '0.25rem 0.75rem', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.875rem' }}
                              >
                                Ergebnis
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

