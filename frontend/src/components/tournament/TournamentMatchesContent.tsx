// Tournament Matches Content (for Tab)
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { matchService, GroupMatch, KnockoutMatch } from '../../services/matchService';
import { participantService } from '../../services/participantService';
import { tableService } from '../../services/tableService';
import { tournamentService } from '../../services/tournamentService';
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
  const [matchType, setMatchType] = useState<'group' | 'ko'>(() => (
    tournament.has_group_phase ? 'group' : 'ko'
  ));
  const [koViewMode, setKoViewMode] = useState<'table' | 'bracket'>('bracket');
  const [decisionMatchesLoading, setDecisionMatchesLoading] = useState(false);
  const [manualPairs, setManualPairs] = useState<Array<{ player1_id: number | null; player2_id: number | null }>>([]);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSaving, setManualSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      // Load tournament participants first
      try {
        const participantsData = await participantService.getTournamentParticipants(tournamentId);
        setParticipants(participantsData);
      } catch (err) {
        const participantsData = await participantService.getAll();
        setParticipants(participantsData);
      }
      
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

  const getBracketSize = (count: number) => {
    if (count <= 4) return 4;
    if (count <= 8) return 8;
    if (count <= 16) return 16;
    if (count <= 32) return 32;
    return 2 ** Math.ceil(Math.log2(count));
  };

  useEffect(() => {
    if (!tournament.has_group_phase && tournament.has_ko_phase) {
      setMatchType('ko');
    }
  }, [tournament.has_group_phase, tournament.has_ko_phase]);

  useEffect(() => {
    if (tournament.mode !== 'knockout' || tournament.ko_draw_method !== 'manual') return;
    if (koMatches.length > 0) return;
    const bracketSize = getBracketSize(participants.length);
    const requiredPairs = bracketSize / 2;
    setManualPairs(prev => {
      if (prev.length === requiredPairs) return prev;
      return Array.from({ length: requiredPairs }, () => ({ player1_id: null, player2_id: null }));
    });
  }, [participants.length, tournament.mode, tournament.ko_draw_method, koMatches.length]);

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

  const handleGenerateDecisionMatches = async () => {
    if (!selectedGroupId) return;
    setDecisionMatchesLoading(true);
    try {
      await tableService.generateDecisionMatches(selectedGroupId);
      await loadGroupMatches();
      alert('Entscheidungsspiele wurden generiert.');
    } catch (err: any) {
      alert(`Fehler beim Generieren: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDecisionMatchesLoading(false);
    }
  };

  const handleDeleteDecisionMatches = async () => {
    if (!selectedGroupId) return;
    if (!confirm('Alle Entscheidungsspiele dieser Gruppe wirklich löschen?')) {
      return;
    }
    setDecisionMatchesLoading(true);
    try {
      await tableService.deleteDecisionMatches(selectedGroupId);
      await loadGroupMatches();
    } catch (err: any) {
      alert(`Fehler beim Löschen: ${err.response?.data?.detail || err.message}`);
    } finally {
      setDecisionMatchesLoading(false);
    }
  };

  const handleGenerateKOBracket = async () => {
    if (!confirm('Möchten Sie wirklich das KO-Bracket generieren? Bestehende KO-Spiele werden dabei gelöscht.')) {
      return;
    }
    try {
      const result = await tournamentService.generateKOBracket(tournamentId);
      alert(`KO-Bracket erfolgreich generiert!\nSpiele: ${result.matches_created}\nErste Runde: Top ${result.first_round_size}\nModus: ${result.mode}`);
      const koData = await matchService.getKnockoutMatches(tournamentId);
      setKoMatches(koData);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Generieren des KO-Brackets');
    }
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

  const getKoParticipantLabel = (match: KnockoutMatch, slot: 1 | 2) => {
    const participantId = slot === 1 ? match.player1_id : match.player2_id;
    if (participantId) {
      return getParticipantNameById(participantId);
    }
    if (tournament.ko_distribution === 'predefined_slots' && match.round > 1 && match.round !== 99) {
      const sourceMatchNo = (match.match_no - 1) * 2 + slot;
      return `Sieger Spiel ${sourceMatchNo}`;
    }
    return '-';
  };

  const updateManualPair = (index: number, slot: 'player1_id' | 'player2_id', value: string) => {
    const parsed = value ? parseInt(value) : null;
    setManualPairs(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [slot]: parsed };
      return next;
    });
  };

  const handleSaveManualPairs = async () => {
    setManualError(null);
    const selectedIds = manualPairs.flatMap(pair => (
      [pair.player1_id, pair.player2_id].filter((id): id is number => id !== null)
    ));
    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== selectedIds.length) {
      setManualError('Teilnehmer dürfen nur einmal zugewiesen werden.');
      return;
    }

    const participantIds = new Set(participants.map(p => p.id));
    for (const id of uniqueIds) {
      if (!participantIds.has(id)) {
        setManualError('Es wurden ungültige Teilnehmer ausgewählt.');
        return;
      }
    }

    if (uniqueIds.size !== participants.length) {
      setManualError('Bitte alle Turnier-Teilnehmer genau einmal zuweisen.');
      return;
    }

    setManualSaving(true);
    try {
      await tournamentService.createManualKOBracket(tournamentId, manualPairs);
      const koData = await matchService.getKnockoutMatches(tournamentId);
      setKoMatches(koData);
      setManualError(null);
    } catch (err: any) {
      setManualError(err.response?.data?.detail || 'Fehler beim Speichern der Paarungen.');
    } finally {
      setManualSaving(false);
    }
  };

  if (loading) return <div style={{ color: theme.colors.text.secondary }}>Wird geladen...</div>;

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const regularGroupMatches = groupMatches.filter(m => !m.is_decision_match);
  const decisionGroupMatches = groupMatches.filter(m => m.is_decision_match);
  const isManualKo = tournament.mode === 'knockout' && tournament.ko_draw_method === 'manual';
  const canGenerateKo = canEdit && tournament.mode === 'knockout' && tournament.has_ko_phase && !tournament.has_group_phase && !isManualKo;

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

                  {regularGroupMatches.length === 0 ? (
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
                          {regularGroupMatches
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
                  {/* Decision Matches */}
                  {(tournament.tie_breaking_rules?.includes('decision_match') || decisionGroupMatches.length > 0) && (
                    <div style={{ marginTop: '2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, color: theme.colors.text.primary }}>Entscheidungsspiele</h4>
                        {canEdit && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              onClick={handleGenerateDecisionMatches}
                              variant="info"
                              disabled={decisionMatchesLoading}
                              style={{ fontSize: '0.875rem' }}
                            >
                              Erzeugen
                            </Button>
                            <Button
                              onClick={handleDeleteDecisionMatches}
                              variant="danger"
                              disabled={decisionMatchesLoading || decisionGroupMatches.length === 0}
                              style={{ fontSize: '0.875rem' }}
                            >
                              Löschen
                            </Button>
                          </div>
                        )}
                      </div>
                      {decisionGroupMatches.length === 0 ? (
                        <div style={{ padding: '1rem', background: theme.colors.background.secondary, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                            Noch keine Entscheidungsspiele vorhanden.
                          </p>
                        </div>
                      ) : (
                        <div style={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: theme.colors.accent.warning, color: theme.colors.background.primary }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Runde</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spiel</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 1</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Spieler 2</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Ergebnis</th>
                                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Aktion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {decisionGroupMatches
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
          {/* Regenerate Button (always visible if can edit and has KO phase) */}
          {canEdit && tournament.has_ko_phase && !isManualKo && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                onClick={handleGenerateKOBracket} 
                variant="warning"
                style={{ fontSize: '0.875rem' }}
              >
                {koMatches.length > 0 ? '🔄 KO-Bracket neu generieren' : '🏆 KO-Bracket generieren'}
              </Button>
            </div>
          )}
          
          {koMatches.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Noch keine KO-Spiele vorhanden.</p>
              {tournament.has_group_phase ? (
                <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>Bitte generieren Sie das KO-Bracket im Tab "Gruppen".</p>
              ) : (
                <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>Bitte erstellen Sie das KO-Bracket für dieses Turnier.</p>
              )}
              {canGenerateKo && (
                <div style={{ marginTop: '1rem' }}>
                  <Button onClick={handleGenerateKOBracket} variant="danger">
                    🏆 KO-Bracket generieren
                  </Button>
                </div>
              )}
              {isManualKo && (
                <div style={{
                  marginTop: '1.5rem',
                  textAlign: 'left',
                  background: theme.colors.background.secondary,
                  border: `1px solid ${theme.colors.border.standard}`,
                  borderRadius: theme.borderRadius.card,
                  padding: '1rem'
                }}>
                  <h4 style={{ marginTop: 0, color: theme.colors.text.primary }}>Manuelle Paarungen</h4>
                  <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary, marginTop: '0.25rem' }}>
                    Weisen Sie alle Turnier-Teilnehmer genau einmal zu. Leere Slots gelten als Freilos.
                  </p>
                  {manualPairs.length === 0 ? (
                    <p style={{ color: theme.colors.text.secondary }}>Teilnehmer werden geladen...</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                      {manualPairs.map((pair, index) => {
                        const usedIds = new Set<number>();
                        manualPairs.forEach((p, idx) => {
                          if (idx === index) return;
                          if (p.player1_id) usedIds.add(p.player1_id);
                          if (p.player2_id) usedIds.add(p.player2_id);
                        });
                        const availablePlayer1 = participants.filter(p => (!usedIds.has(p.id) && p.id !== pair.player2_id) || p.id === pair.player1_id);
                        const availablePlayer2 = participants.filter(p => (!usedIds.has(p.id) && p.id !== pair.player1_id) || p.id === pair.player2_id);
                        return (
                          <div key={`pair-${index}`} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ minWidth: '60px', color: theme.colors.text.secondary }}>Spiel {index + 1}</span>
                            <select
                              value={pair.player1_id ?? ''}
                              onChange={(e) => updateManualPair(index, 'player1_id', e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: `1px solid ${theme.colors.border.standard}`,
                                borderRadius: theme.borderRadius.input,
                                background: theme.colors.background.primary,
                                color: theme.colors.text.primary
                              }}
                            >
                              <option value="">-</option>
                              {availablePlayer1.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.first_name} {p.last_name}
                                </option>
                              ))}
                            </select>
                            <span style={{ color: theme.colors.text.secondary }}>vs</span>
                            <select
                              value={pair.player2_id ?? ''}
                              onChange={(e) => updateManualPair(index, 'player2_id', e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.5rem',
                                border: `1px solid ${theme.colors.border.standard}`,
                                borderRadius: theme.borderRadius.input,
                                background: theme.colors.background.primary,
                                color: theme.colors.text.primary
                              }}
                            >
                              <option value="">-</option>
                              {availablePlayer2.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.first_name} {p.last_name}
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {manualError && (
                    <div style={{
                      marginTop: '1rem',
                      padding: '0.75rem',
                      background: `${theme.colors.accent.error}20`,
                      border: `1px solid ${theme.colors.accent.error}`,
                      borderRadius: theme.borderRadius.card,
                      color: theme.colors.accent.error
                    }}>
                      {manualError}
                    </div>
                  )}
                  <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button onClick={handleSaveManualPairs} variant="success" disabled={manualSaving || manualPairs.length === 0}>
                      {manualSaving ? 'Speichere...' : 'Paarungen speichern'}
                    </Button>
                  </div>
                </div>
              )}
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
                    drawMode={tournament.ko_distribution}
                    tournamentId={tournamentId}
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
                          <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{getKoParticipantLabel(match, 1)}</td>
                          <td style={{ padding: '0.75rem', color: theme.colors.text.primary }}>{getKoParticipantLabel(match, 2)}</td>
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

