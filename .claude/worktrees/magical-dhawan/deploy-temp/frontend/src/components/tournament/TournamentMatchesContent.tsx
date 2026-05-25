// Tournament Matches Content (for Tab)
import { useState, useEffect } from 'react';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { matchService, GroupMatch, KnockoutMatch } from '../../services/matchService';
import { participantService } from '../../services/participantService';
import { Tournament, Participant } from '../../types';
import KOBracket from './KOBracket';

interface TournamentMatchesContentProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentMatchesContent({ tournamentId, tournament }: TournamentMatchesContentProps) {
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupMatches, setGroupMatches] = useState<GroupMatch[]>([]);
  const [koMatches, setKoMatches] = useState<KnockoutMatch[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<number | null>(null);
  const [scoreForm, setScoreForm] = useState({ score1: '', score2: '' });
  const [matchType, setMatchType] = useState<'group' | 'ko'>('group');
  const [koViewMode, setKoViewMode] = useState<'table' | 'bracket'>('bracket');

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      // Load all participants first
      const participantsData = await participantService.getAll();
      setParticipants(participantsData);
      
      if (tournament.has_group_phase) {
        const groupsData = await groupService.getGroups(tournamentId);
        
        const fullGroups = await Promise.all(
          groupsData.map(async (g) => await groupService.getGroup(g.id))
        );
        setGroups(fullGroups);
        
        if (fullGroups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(fullGroups[0].id);
        }
      }
      
      if (tournament.has_ko_phase) {
        const koData = await matchService.getKnockoutMatches(tournamentId);
        setKoMatches(koData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGroupId && matchType === 'group') {
      loadGroupMatches();
    }
  }, [selectedGroupId, matchType]);

  const loadGroupMatches = async () => {
    if (!selectedGroupId) return;
    
    try {
      const matchesData = await matchService.getGroupMatches(tournamentId, selectedGroupId);
      setGroupMatches(matchesData);
    } catch (err) {
      console.error('Failed to load matches:', err);
    }
  };

  const handleEdit = (match: GroupMatch | KnockoutMatch) => {
    setEditingMatch(match.id);
    setScoreForm({
      score1: match.score1?.toString() || '',
      score2: match.score2?.toString() || '',
    });
  };

  const handleMatchEditClick = (matchId: number) => {
    const match = koMatches.find(m => m.id === matchId);
    if (match) {
      handleEdit(match);
    }
  };

  const handleSave = async (matchId: number) => {
    try {
      if (matchType === 'group') {
        await matchService.updateGroupMatch(matchId, {
          score1: scoreForm.score1 ? parseInt(scoreForm.score1) : undefined,
          score2: scoreForm.score2 ? parseInt(scoreForm.score2) : undefined,
        });
        // Reload matches to check for decision matches
        await loadGroupMatches();
        // Check if new decision matches were generated (they would appear in the list)
        // The backend automatically generates them after match update
      } else {
        await matchService.updateKnockoutMatch(matchId, {
          score1: scoreForm.score1 ? parseInt(scoreForm.score1) : undefined,
          score2: scoreForm.score2 ? parseInt(scoreForm.score2) : undefined,
        });
        const koData = await matchService.getKnockoutMatches(tournamentId);
        setKoMatches(koData);
      }
      setEditingMatch(null);
      setScoreForm({ score1: '', score2: '' });
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

  const getParticipantNameById = (participantId: number | null): string => {
    if (!participantId) return '-';
    const participant = participants.find(p => p.id === participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : `ID ${participantId}`;
  };

  if (loading) return <div>Wird geladen...</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div>
      {/* Phase Selection */}
      {tournament.has_group_phase && tournament.has_ko_phase && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Phase auswählen:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setMatchType('group')}
              style={{
                padding: '0.5rem 1rem',
                background: matchType === 'group' ? '#007bff' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: matchType === 'group' ? 'bold' : 'normal'
              }}
            >
              Gruppenphase
            </button>
            <button
              onClick={() => setMatchType('ko')}
              style={{
                padding: '0.5rem 1rem',
                background: matchType === 'ko' ? '#dc3545' : '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: matchType === 'ko' ? 'bold' : 'normal'
              }}
            >
              KO-Phase
            </button>
          </div>
        </div>
      )}

      {/* Group Phase Matches */}
      {matchType === 'group' && (
        <>
          {groups.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
              <p>Noch keine Gruppen vorhanden.</p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>Bitte erstellen Sie zuerst Gruppen im Tab "Gruppen".</p>
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
                  <h3>Gruppe: {selectedGroup.name}</h3>
                  <div style={{ marginBottom: '1rem', color: '#666' }}>
                    {selectedGroup.participants.length} Teilnehmer
                  </div>

                  {groupMatches.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
                      <p>Noch keine Spiele vorhanden.</p>
                      <p style={{ fontSize: '0.875rem', color: '#666' }}>Bitte generieren Sie die Spiele im Tab "Gruppen".</p>
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
                          {groupMatches
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
        </>
      )}

      {/* KO Phase Matches */}
      {matchType === 'ko' && (
        <>
          {koMatches.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: '#f8f9fa', borderRadius: '8px' }}>
              <p>Noch keine KO-Spiele vorhanden.</p>
              <p style={{ fontSize: '0.875rem', color: '#666' }}>Bitte generieren Sie das KO-Bracket im Tab "Gruppen".</p>
            </div>
          ) : (
            <>
              {/* View Mode Toggle */}
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold' }}>
                  Ansicht:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setKoViewMode('bracket')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: koViewMode === 'bracket' ? '#dc3545' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: koViewMode === 'bracket' ? 'bold' : 'normal'
                    }}
                  >
                    Turnierbaum
                  </button>
                  <button
                    onClick={() => setKoViewMode('table')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: koViewMode === 'table' ? '#dc3545' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: koViewMode === 'table' ? 'bold' : 'normal'
                    }}
                  >
                    Tabelle
                  </button>
                </div>
              </div>

              {/* Bracket View */}
              {koViewMode === 'bracket' && (
                <div style={{ position: 'relative' }}>
                  {/* Edit Dialog Overlay */}
                  {editingMatch && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 1000
                    }}>
                      <div style={{
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        minWidth: '400px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
                      }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Ergebnis eintragen</h3>
                        {(() => {
                          const match = koMatches.find(m => m.id === editingMatch);
                          if (!match) return null;
                          return (
                            <>
                              <div style={{ marginBottom: '1rem' }}>
                                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{getParticipantNameById(match.player1_id)}</div>
                                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{getParticipantNameById(match.player2_id)}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  style={{ width: '80px', padding: '0.5rem', textAlign: 'center', border: '2px solid #ddd', borderRadius: '4px', fontSize: '1.25rem' }}
                                  min="0"
                                  autoFocus
                                />
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  style={{ width: '80px', padding: '0.5rem', textAlign: 'center', border: '2px solid #ddd', borderRadius: '4px', fontSize: '1.25rem' }}
                                  min="0"
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={handleCancel}
                                  style={{ padding: '0.5rem 1.5rem', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                  Abbrechen
                                </button>
                                <button
                                  onClick={() => handleSave(match.id)}
                                  style={{ padding: '0.5rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                >
                                  Speichern
                                </button>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <KOBracket
                    matches={koMatches}
                    participants={participants}
                    onMatchEdit={handleMatchEditClick}
                    editingMatchId={editingMatch}
                  />
                </div>
              )}

              {/* Table View */}
              {koViewMode === 'table' && (
                <div style={{ background: 'white', border: '1px solid #dee2e6', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#dc3545', color: 'white' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Runde</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ergebnis</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>Aktion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {koMatches
                        .sort((a, b) => (a.round - b.round) || (a.match_no - b.match_no))
                        .map((match) => (
                        <tr key={match.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.75rem' }}>Runde {match.round === 99 ? 'Bronze' : match.round}</td>
                          <td style={{ padding: '0.75rem' }}>Spiel {match.match_no}</td>
                          <td style={{ padding: '0.75rem' }}>{getParticipantNameById(match.player1_id)}</td>
                          <td style={{ padding: '0.75rem' }}>{getParticipantNameById(match.player2_id)}</td>
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

