// Tournament Matches Content (for Tab)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { matchService, GroupMatch, KnockoutMatch } from '../../services/matchService';
import { participantService } from '../../services/participantService';
import { Tournament, Participant } from '../../types';
import { theme } from '../../theme/theme';
import { Button } from '../ui';
import KOBracket from './KOBracket';

interface TournamentMatchesContentProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentMatchesContent({ tournamentId, tournament }: TournamentMatchesContentProps) {
  const { canEdit } = useAuth();
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

  if (loading) return <div style={{ color: theme.colors.text.secondary }}>Wird geladen...</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div>
      {/* Phase Selection */}
      {tournament.has_group_phase && tournament.has_ko_phase && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
            Phase auswählen:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              onClick={() => setMatchType('group')}
              variant={matchType === 'group' ? 'info' : 'secondary'}
              style={{ fontWeight: matchType === 'group' ? 'bold' : 'normal' }}
            >
              Gruppenphase
            </Button>
            <Button
              onClick={() => setMatchType('ko')}
              variant={matchType === 'ko' ? 'danger' : 'secondary'}
              style={{ fontWeight: matchType === 'ko' ? 'bold' : 'normal' }}
            >
              KO-Phase
            </Button>
          </div>
        </div>
      )}

      {/* Group Phase Matches */}
      {matchType === 'group' && (
        <>
          {groups.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Noch keine Gruppen vorhanden.</p>
              <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>Bitte erstellen Sie zuerst Gruppen im Tab "Gruppen".</p>
            </div>
          ) : (
            <>
              {/* Group Tabs */}
              <div style={{ 
                marginBottom: '2rem',
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                borderBottom: `2px solid ${theme.colors.border.standard}`,
                paddingBottom: '0.5rem'
              }}>
                {groups.map(group => (
                  <Button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    variant={selectedGroupId === group.id ? 'primary' : 'secondary'}
                    style={{ 
                      fontWeight: selectedGroupId === group.id ? 'bold' : 'normal',
                      whiteSpace: 'nowrap',
                      borderRadius: `${theme.borderRadius.card} ${theme.borderRadius.card} 0 0`,
                      borderBottom: selectedGroupId === group.id ? `3px solid ${theme.colors.accent.primary}` : 'none',
                      marginBottom: selectedGroupId === group.id ? '-2px' : '0'
                    }}
                  >
                    {group.name} ({group.participants.length})
                  </Button>
                ))}
              </div>

              {selectedGroup && (
                <>
                  <h3 style={{ color: theme.colors.text.primary }}>Gruppe: {selectedGroup.name}</h3>
                  <div style={{ marginBottom: '1rem', color: theme.colors.text.secondary }}>
                    {selectedGroup.participants.length} Teilnehmer
                  </div>

                  {groupMatches.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
                      <p style={{ color: theme.colors.text.primary }}>Noch keine Spiele vorhanden.</p>
                      <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>Bitte generieren Sie die Spiele im Tab "Gruppen".</p>
                    </div>
                  ) : (
                    <div style={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: theme.colors.accent.primary, color: theme.colors.background.primary }}>
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
                            <tr key={match.id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}`, background: theme.colors.background.secondary }}>
                              <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>Runde {match.round}</td>
                              <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>Spiel {match.match_no}</td>
                              <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{getParticipantName(match.player1_id)}</td>
                              <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{getParticipantName(match.player2_id)}</td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {editingMatch === match.id ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                                    <input
                                      type="number"
                                      value={scoreForm.score1}
                                      onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                      style={{ 
                                        width: '60px', 
                                        padding: '0.25rem', 
                                        textAlign: 'center', 
                                        border: `1px solid ${theme.colors.border.standard}`, 
                                        borderRadius: theme.borderRadius.input,
                                        background: theme.colors.background.primary,
                                        color: theme.colors.text.primary
                                      }}
                                      min="0"
                                    />
                                    <span style={{ color: theme.colors.text.primary }}>:</span>
                                    <input
                                      type="number"
                                      value={scoreForm.score2}
                                      onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                      style={{ 
                                        width: '60px', 
                                        padding: '0.25rem', 
                                        textAlign: 'center', 
                                        border: `1px solid ${theme.colors.border.standard}`, 
                                        borderRadius: theme.borderRadius.input,
                                        background: theme.colors.background.primary,
                                        color: theme.colors.text.primary
                                      }}
                                      min="0"
                                    />
                                  </div>
                                ) : (
                                  <span style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>
                                    {match.score1 !== null && match.score2 !== null 
                                      ? `${match.score1} : ${match.score2}`
                                      : '- : -'
                                    }
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {canEdit && editingMatch === match.id ? (
                                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                    <Button
                                      onClick={() => handleSave(match.id)}
                                      variant="success"
                                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                    >
                                      ✓
                                    </Button>
                                    <Button
                                      onClick={handleCancel}
                                      variant="danger"
                                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ) : canEdit ? (
                                  <Button
                                    onClick={() => handleEdit(match)}
                                    variant="info"
                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                  >
                                    Ergebnis
                                  </Button>
                                ) : (
                                  <span style={{ color: theme.colors.text.secondary }}>-</span>
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
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Noch keine KO-Spiele vorhanden.</p>
              <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>Bitte generieren Sie das KO-Bracket im Tab "Gruppen".</p>
            </div>
          ) : (
            <>
              {/* View Mode Toggle */}
              <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>
                  Ansicht:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    onClick={() => setKoViewMode('bracket')}
                    variant={koViewMode === 'bracket' ? 'danger' : 'secondary'}
                    style={{ fontWeight: koViewMode === 'bracket' ? 'bold' : 'normal' }}
                  >
                    Turnierbaum
                  </Button>
                  <Button
                    onClick={() => setKoViewMode('table')}
                    variant={koViewMode === 'table' ? 'danger' : 'secondary'}
                    style={{ fontWeight: koViewMode === 'table' ? 'bold' : 'normal' }}
                  >
                    Tabelle
                  </Button>
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
                        background: theme.colors.background.card,
                        padding: '2rem',
                        borderRadius: theme.borderRadius.modal,
                        minWidth: '400px',
                        boxShadow: theme.shadows.card,
                        border: `1px solid ${theme.colors.border.standard}`
                      }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: theme.colors.text.primary }}>Ergebnis eintragen</h3>
                        {(() => {
                          const match = koMatches.find(m => m.id === editingMatch);
                          if (!match) return null;
                          return (
                            <>
                              <div style={{ marginBottom: '1rem' }}>
                                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>{getParticipantNameById(match.player1_id)}</div>
                                <div style={{ marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>{getParticipantNameById(match.player2_id)}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  style={{ 
                                    width: '80px', 
                                    padding: '0.5rem', 
                                    textAlign: 'center', 
                                    border: `2px solid ${theme.colors.border.standard}`, 
                                    borderRadius: theme.borderRadius.input, 
                                    fontSize: '1.25rem',
                                    background: theme.colors.background.primary,
                                    color: theme.colors.text.primary
                                  }}
                                  min="0"
                                  autoFocus
                                />
                                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  style={{ 
                                    width: '80px', 
                                    padding: '0.5rem', 
                                    textAlign: 'center', 
                                    border: `2px solid ${theme.colors.border.standard}`, 
                                    borderRadius: theme.borderRadius.input, 
                                    fontSize: '1.25rem',
                                    background: theme.colors.background.primary,
                                    color: theme.colors.text.primary
                                  }}
                                  min="0"
                                />
                              </div>
                              {canEdit && (
                                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                  <Button
                                    onClick={handleCancel}
                                    variant="secondary"
                                  >
                                    Abbrechen
                                  </Button>
                                  <Button
                                    onClick={() => handleSave(match.id)}
                                    variant="success"
                                  >
                                    Speichern
                                  </Button>
                                </div>
                              )}
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
                <div style={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: theme.colors.accent.error, color: theme.colors.text.primary }}>
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
                        <tr key={match.id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}`, background: theme.colors.background.secondary }}>
                          <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>Runde {match.round === 99 ? 'Bronze' : match.round}</td>
                          <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>Spiel {match.match_no}</td>
                          <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{getParticipantNameById(match.player1_id)}</td>
                          <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{getParticipantNameById(match.player2_id)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {editingMatch === match.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center' }}>
                                <input
                                  type="number"
                                  value={scoreForm.score1}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                                  style={{ 
                                    width: '60px', 
                                    padding: '0.25rem', 
                                    textAlign: 'center', 
                                    border: `1px solid ${theme.colors.border.standard}`, 
                                    borderRadius: theme.borderRadius.input,
                                    background: theme.colors.background.primary,
                                    color: theme.colors.text.primary
                                  }}
                                  min="0"
                                />
                                <span style={{ color: theme.colors.text.primary }}>:</span>
                                <input
                                  type="number"
                                  value={scoreForm.score2}
                                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                                  style={{ 
                                    width: '60px', 
                                    padding: '0.25rem', 
                                    textAlign: 'center', 
                                    border: `1px solid ${theme.colors.border.standard}`, 
                                    borderRadius: theme.borderRadius.input,
                                    background: theme.colors.background.primary,
                                    color: theme.colors.text.primary
                                  }}
                                  min="0"
                                />
                              </div>
                            ) : (
                              <span style={{ fontWeight: 'bold', color: theme.colors.text.primary }}>
                                {match.score1 !== null && match.score2 !== null 
                                  ? `${match.score1} : ${match.score2}`
                                  : '- : -'
                                }
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {canEdit && editingMatch === match.id ? (
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                <Button
                                  onClick={() => handleSave(match.id)}
                                  variant="success"
                                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                >
                                  ✓
                                </Button>
                                <Button
                                  onClick={handleCancel}
                                  variant="danger"
                                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                >
                                  ✕
                                </Button>
                              </div>
                            ) : canEdit ? (
                              <Button
                                onClick={() => handleEdit(match)}
                                variant="info"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                              >
                                Ergebnis
                              </Button>
                            ) : (
                              <span style={{ color: theme.colors.text.secondary }}>-</span>
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

