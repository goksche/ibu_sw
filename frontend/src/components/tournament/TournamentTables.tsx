// Tournament Tables Tab
import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { tableService, GroupTable, TournamentStandings } from '../../services/tableService';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { qualificationService, QualificationTable } from '../../services/qualificationService';
import { theme } from '../../theme/theme';
import { Button } from '../ui';

// Qualification Table View Component
interface QualificationTableViewProps {
  qualificationTable: QualificationTable;
  tournament: Tournament;
  onRefresh: () => void;
}

function QualificationTableView({ qualificationTable, tournament, onRefresh }: QualificationTableViewProps) {
  const [manualSelections, setManualSelections] = useState<Record<number, number[]>>({});
  const [savingPosition, setSavingPosition] = useState<number | null>(null);

  useEffect(() => {
    const initialSelections: Record<number, number[]> = {};
    qualificationTable.fallback_candidates.forEach(rule => {
      if (rule.manual_selected_ids && rule.manual_selected_ids.length > 0) {
        initialSelections[rule.position] = rule.manual_selected_ids;
      }
    });
    setManualSelections(initialSelections);
  }, [qualificationTable]);

  const toggleManualSelection = (position: number, participantId: number, maxCount: number) => {
    setManualSelections(prev => {
      const current = prev[position] || [];
      const isSelected = current.includes(participantId);
      if (isSelected) {
        return { ...prev, [position]: current.filter(id => id !== participantId) };
      }
      if (current.length >= maxCount) {
        return prev;
      }
      return { ...prev, [position]: [...current, participantId] };
    });
  };

  const handleSaveManualSelection = async (position: number, count: number) => {
    const selectedIds = manualSelections[position] || [];
    if (selectedIds.length !== count) {
      alert(`Bitte genau ${count} Teilnehmer auswählen.`);
      return;
    }
    setSavingPosition(position);
    try {
      await qualificationService.setManualFallbackSelection(tournament.id, position, selectedIds);
      onRefresh();
    } catch (error: any) {
      alert(`Fehler bei manueller Auswahl: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSavingPosition(null);
    }
  };

  const handleClearManualSelection = async (position: number) => {
    setSavingPosition(position);
    try {
      await qualificationService.setManualFallbackSelection(tournament.id, position, []);
      onRefresh();
    } catch (error: any) {
      alert(`Fehler beim Zurücksetzen: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSavingPosition(null);
    }
  };

  return (
    <div>
      <div style={{ 
        background: theme.colors.background.card, 
        border: `1px solid ${theme.colors.border.standard}`, 
        borderRadius: theme.borderRadius.card, 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '1rem', 
          color: theme.colors.text.primary,
          borderBottom: `2px solid ${theme.colors.accent.warning}`,
          paddingBottom: '0.5rem'
        }}>
          Qualifikationsübersicht
        </h3>
        
        <div style={{ marginBottom: '1.5rem', color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
          <div><strong>Qualifikationsplan:</strong></div>
          <div>Basis pro Gruppe: {qualificationTable.basis_per_group}</div>
          <div>Gesamt qualifiziert: {qualificationTable.qualified_count}</div>
          {qualificationTable.qualification_plan.remainder > 0 && (
            <div style={{ color: theme.colors.accent.warning, marginTop: '0.5rem' }}>
              ⚠️ Es qualifizieren sich zusätzlich die besten {qualificationTable.qualification_plan.remainder} Teilnehmer 
              aus Position {qualificationTable.basis_per_group + 1}
            </div>
          )}
        </div>

        {/* Group Qualifiers */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ color: theme.colors.text.primary, marginBottom: '1rem' }}>Qualifizierte Teilnehmer (Basis)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {qualificationTable.group_qualifiers.map((groupQual) => (
              <div 
                key={groupQual.group_id}
                style={{
                  background: theme.colors.background.secondary,
                  border: `1px solid ${theme.colors.border.standard}`,
                  borderRadius: theme.borderRadius.card,
                  padding: '1rem'
                }}
              >
                <h5 style={{ 
                  marginTop: 0, 
                  marginBottom: '0.75rem',
                  color: theme.colors.accent.primary,
                  fontSize: '1rem'
                }}>
                  {groupQual.group_name}
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {groupQual.basis_qualifiers.map((qualifier) => (
                    <div 
                      key={qualifier.participant_id}
                      style={{
                        padding: '0.5rem',
                        background: theme.colors.background.card,
                        borderRadius: theme.borderRadius.input,
                        border: `1px solid ${qualifier.qualified ? theme.colors.accent.success : theme.colors.border.standard}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: theme.colors.text.primary,
                          marginRight: '0.5rem'
                        }}>
                          {qualifier.position}.
                        </span>
                        <span style={{ color: theme.colors.text.primary }}>{qualifier.name}</span>
                        {qualifier.qualified && (
                          <span style={{ 
                            color: theme.colors.accent.success, 
                            fontWeight: 'bold',
                            marginLeft: '0.5rem'
                          }}>
                            ✓
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>
                        Diff: {qualifier.stats.diff > 0 ? '+' : ''}{qualifier.stats.diff}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fallback Candidates */}
        {qualificationTable.fallback_candidates.length > 0 && (
          <div>
            <h4 style={{ color: theme.colors.text.primary, marginBottom: '1rem' }}>
              Zusätzliche Qualifikanten (Fallback-Regeln)
            </h4>
            {qualificationTable.fallback_candidates.map((rule, ruleIdx) => {
              const cutoffGroup = rule.cutoff_tie_group || [];
              const candidateMap = new Map(rule.candidates.map(c => [c.participant_id, c]));
              const selectedIds = manualSelections[rule.position] || [];
              const hasManualSelection = rule.manual_selected_ids && rule.manual_selected_ids.length > 0;

              return (
              <div 
                key={ruleIdx}
                style={{
                  background: `${theme.colors.accent.warning}15`,
                  border: `1px solid ${theme.colors.accent.warning}40`,
                  borderRadius: theme.borderRadius.card,
                  padding: '1rem',
                  marginBottom: '1rem'
                }}
              >
                <div style={{ 
                  fontWeight: 'bold', 
                  color: theme.colors.text.primary,
                  marginBottom: '0.75rem',
                  fontSize: '0.875rem'
                }}>
                  Komplette Rangliste aller {rule.position}. Platzierten (Besten {rule.count} qualifizieren sich)
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: theme.colors.background.secondary }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Rang</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Status</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Gruppe</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Diff</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LF</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LA</th>
                      {tournament.league_scoring_system === 'points' && (
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Pkt</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rule.candidates.map((candidate, idx) => {
                      const isQualified = candidate.qualified;
                      const isInQualificationRange = idx < rule.count;
                      return (
                        <tr 
                          key={candidate.participant_id}
                          style={{
                            borderBottom: `1px solid ${theme.colors.border.standard}`,
                            background: isQualified 
                              ? `${theme.colors.accent.success}20` 
                              : idx % 2 === 0 
                                ? theme.colors.background.card 
                                : theme.colors.background.secondary,
                            borderLeft: isQualified ? `4px solid ${theme.colors.accent.success}` : 'none'
                          }}
                        >
                          <td style={{ 
                            padding: '0.5rem', 
                            color: theme.colors.text.primary, 
                            fontWeight: isQualified ? 'bold' : 'normal',
                            textAlign: 'center'
                          }}>
                            {idx + 1}.
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            {isQualified ? (
                              <span style={{ 
                                color: theme.colors.accent.success, 
                                fontWeight: 'bold',
                                fontSize: '0.875rem'
                              }}>
                                ✓ Qualifiziert
                              </span>
                            ) : isInQualificationRange ? (
                              <span style={{ 
                                color: theme.colors.accent.warning, 
                                fontSize: '0.75rem'
                              }}>
                                Würde qualifizieren
                              </span>
                            ) : (
                              <span style={{ 
                                color: theme.colors.text.secondary, 
                                fontSize: '0.75rem'
                              }}>
                                Nicht qualifiziert
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '0.5rem', color: theme.colors.text.primary, fontWeight: isQualified ? 'bold' : 'normal' }}>
                            {candidate.name}
                          </td>
                          <td style={{ padding: '0.5rem', color: theme.colors.text.secondary }}>
                            {candidate.group_name || `Gruppe ${candidate.group_id}`}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: candidate.stats.diff > 0 ? theme.colors.accent.success : candidate.stats.diff < 0 ? theme.colors.accent.error : theme.colors.text.primary }}>
                            {candidate.stats.diff > 0 ? '+' : ''}{candidate.stats.diff}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>
                            {candidate.stats.goals_for}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>
                            {candidate.stats.goals_against}
                          </td>
                          {tournament.league_scoring_system === 'points' && (
                            <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.accent.info }}>
                              {candidate.stats.points ?? 0}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {cutoffGroup.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '0.5rem' }}>
                      Gleichstand um die letzten {rule.count} Plätze
                    </div>
                    <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginBottom: '0.75rem' }}>
                      Bitte auswählen, wer sich qualifiziert (max. {rule.count}).
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {cutoffGroup.map(pid => {
                        const candidate = candidateMap.get(pid);
                        if (!candidate) return null;
                        const isSelected = selectedIds.includes(pid);
                        return (
                          <label
                            key={pid}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem',
                              borderRadius: theme.borderRadius.input,
                              background: isSelected ? `${theme.colors.accent.success}20` : theme.colors.background.secondary,
                              border: `1px solid ${theme.colors.border.standard}`,
                              cursor: 'pointer'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleManualSelection(rule.position, pid, rule.count)}
                            />
                            <span style={{ color: theme.colors.text.primary }}>
                              {candidate.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <Button
                        onClick={() => handleSaveManualSelection(rule.position, rule.count)}
                        variant="success"
                        disabled={savingPosition === rule.position}
                        style={{ fontSize: '0.875rem' }}
                      >
                        Auswahl speichern
                      </Button>
                      <Button
                        onClick={() => handleClearManualSelection(rule.position)}
                        variant="secondary"
                        disabled={savingPosition === rule.position || !hasManualSelection}
                        style={{ fontSize: '0.875rem' }}
                      >
                        Zurücksetzen
                      </Button>
                    </div>
                    {hasManualSelection && (
                      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: theme.colors.text.secondary }}>
                        Manuelle Auswahl aktiv.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          </div>
        )}
        
        {qualificationTable.fallback_candidates.length === 0 && (
          <div style={{ 
            padding: '1rem', 
            background: theme.colors.background.secondary, 
            borderRadius: theme.borderRadius.card,
            color: theme.colors.text.secondary,
            fontSize: '0.875rem'
          }}>
            Keine zusätzlichen Qualifikanten erforderlich.
          </div>
        )}
      </div>
    </div>
  );
}

// Mini Table Section Component
interface MiniTableSectionProps {
  tieMiniTables: Array<{
    participant_ids: number[];
    mini_table: Array<{ participant_id: number; name: string; games: number; wins: number; draws: number; losses: number; goals_for: number; goals_against: number; diff: number; points?: number }>;
    is_completely_tied?: boolean;
    unresolved_tie_groups?: number[][];
  }>;
  tournament: Tournament;
  selectedGroupId: number | null;
  onResolved: () => void;
}

function MiniTableSection({ tieMiniTables, tournament, selectedGroupId, onResolved }: MiniTableSectionProps) {
  const [expandedTables, setExpandedTables] = useState<Set<number>>(new Set([0])); // Expand first table by default

  const toggleTable = (index: number) => {
    setExpandedTables(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <>
      {tieMiniTables.map((_tieMiniTable, tableIndex) => {
        const isExpanded = expandedTables.has(tableIndex);
        const unresolvedGroups = (_tieMiniTable.unresolved_tie_groups && _tieMiniTable.unresolved_tie_groups.length > 0)
          ? _tieMiniTable.unresolved_tie_groups
          : (_tieMiniTable.is_completely_tied ? [_tieMiniTable.participant_ids] : []);
        return (
          <div 
            key={tableIndex}
            style={{ 
              marginTop: '1rem',
              background: theme.colors.background.card, 
              border: `1px solid ${theme.colors.border.standard}`, 
              borderRadius: theme.borderRadius.card, 
              overflow: 'hidden' 
            }}
          >
            {/* Collapsible header */}
            <div
              onClick={() => toggleTable(tableIndex)}
              style={{
                padding: '0.75rem 1rem',
                background: theme.colors.background.secondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                userSelect: 'none',
                borderBottom: isExpanded ? `1px solid ${theme.colors.border.standard}` : 'none'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                {isExpanded ? '▾' : '▸'}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
                Direktbegegnungen (Minitabelle) - Gleichstand mit {_tieMiniTable.participant_ids.length} Teilnehmern
              </span>
              {_tieMiniTable.is_completely_tied && (
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: theme.colors.accent.error, 
                  fontWeight: 'normal',
                  marginLeft: '0.5rem'
                }}>
                  ⚠️ Komplett identisch!
                </span>
              )}
            </div>
            
            {/* Collapsible content */}
            {isExpanded && (
              <div style={{ padding: '1rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: theme.colors.background.secondary }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Sp</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>S</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>U</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>N</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LF</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LA</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Diff</th>
                      {tournament.league_scoring_system === 'points' && (
                        <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: `1px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Pkt</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {_tieMiniTable.mini_table.map((miniRow, miniIdx) => (
                      <tr key={miniRow.participant_id} style={{ 
                        borderBottom: `1px solid ${theme.colors.border.standard}`, 
                        background: miniIdx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary 
                      }}>
                        <td style={{ padding: '0.5rem', textAlign: 'left', color: theme.colors.text.primary, fontWeight: '500' }}>
                          {miniRow.name}
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.games}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.wins}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.draws}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.losses}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.goals_for}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', color: theme.colors.text.primary }}>{miniRow.goals_against}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: miniRow.diff > 0 ? theme.colors.accent.success : miniRow.diff < 0 ? theme.colors.accent.error : theme.colors.text.primary }}>
                          {miniRow.diff > 0 ? '+' : ''}{miniRow.diff}
                        </td>
                        {tournament.league_scoring_system === 'points' && (
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.accent.info }}>
                            {miniRow.points ?? 0}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Show tie-break resolution options if completely tied */}
                {selectedGroupId && unresolvedGroups.length > 0 && (
                  <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {unresolvedGroups.map((groupIds, idx) => (
                      <div key={`${tableIndex}-tie-${idx}`}>
                        <div style={{ fontSize: '0.8rem', color: theme.colors.text.secondary, marginBottom: '0.5rem' }}>
                          Offener Gleichstand ({groupIds.length} Teilnehmer)
                        </div>
                        <TieBreakResolutionComponent
                          groupId={selectedGroupId}
                          participantIds={groupIds}
                          miniTable={_tieMiniTable.mini_table}
                          onResolved={onResolved}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

// Tie Break Resolution Component
interface TieBreakResolutionProps {
  groupId: number;
  participantIds: number[];
  miniTable: Array<{ participant_id: number; name: string }>;  // Mini table entries for participant names
  onResolved: () => void;
}

function TieBreakResolutionComponent({ groupId, participantIds, miniTable, onResolved }: TieBreakResolutionProps) {
  const [loading, setLoading] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<number | null>(null);
  const [showManualSelection, setShowManualSelection] = useState(false);
  
  // Create participant name map
  const participantNameMap = new Map(
    miniTable.map(entry => [entry.participant_id, entry.name])
  );

  const handleGeneratePlayoff = async () => {
    setLoading(true);
    try {
      await tableService.generateTieBreakPlayoff(groupId, participantIds);
      alert('Spielplan wurde erstellt! Sie können die Spiele jetzt eintragen.');
      onResolved();
    } catch (error: any) {
      alert(`Fehler beim Erstellen des Spielplans: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSelection = async () => {
    if (!confirm('Möchten Sie wirklich einen Gewinner zufällig auswählen?')) {
      return;
    }
    setLoading(true);
    try {
      const result = await tableService.resolveTieBreakRandom(groupId, participantIds);
      alert(`Gewinner per Zufall ausgewählt: Teilnehmer ID ${result.winner_id}`);
      onResolved();
    } catch (error: any) {
      alert(`Fehler bei zufälliger Auswahl: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSelection = async () => {
    if (!selectedWinner) {
      alert('Bitte wählen Sie einen Gewinner aus.');
      return;
    }
    setLoading(true);
    try {
      await tableService.resolveTieBreakManual(groupId, participantIds, selectedWinner);
      alert('Gewinner manuell festgelegt.');
      onResolved();
    } catch (error: any) {
      alert(`Fehler bei manueller Auswahl: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      background: `${theme.colors.accent.error}10`,
      border: `1px solid ${theme.colors.accent.error}40`,
      borderRadius: theme.borderRadius.card
    }}>
      <div style={{
        fontSize: '0.875rem',
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        marginBottom: '0.75rem'
      }}>
        Gleichstand-Auflösung:
      </div>
      {true && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Button
            onClick={handleGeneratePlayoff}
            disabled={loading}
            variant="info"
            style={{ width: '100%' }}
          >
            📅 Spielplan erstellen (jeder gegen jeden)
          </Button>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {!showManualSelection ? (
              <>
                <Button
                  onClick={() => setShowManualSelection(true)}
                  disabled={loading}
                  variant="secondary"
                  style={{ flex: 1 }}
                >
                  👤 Manuell wählen
                </Button>
                <Button
                  onClick={handleRandomSelection}
                  disabled={loading}
                  variant="warning"
                  style={{ flex: 1 }}
                >
                  🎲 Zufällig wählen
                </Button>
              </>
            ) : (
            <>
              <select
                value={selectedWinner || ''}
                onChange={(e) => setSelectedWinner(parseInt(e.target.value))}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontSize: '0.875rem',
                  border: `1px solid ${theme.colors.border.standard}`,
                  borderRadius: theme.borderRadius.input,
                  background: theme.colors.background.secondary,
                  color: theme.colors.text.primary
                }}
              >
                <option value="">Gewinner auswählen...</option>
                {participantIds.map((pid) => (
                  <option key={pid} value={pid}>
                    {participantNameMap.get(pid) || `ID ${pid}`}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleManualSelection}
                disabled={loading || !selectedWinner}
                variant="success"
                style={{ flex: '0 0 auto' }}
              >
                ✓ Bestätigen
              </Button>
              <Button
                onClick={() => {
                  setShowManualSelection(false);
                  setSelectedWinner(null);
                }}
                disabled={loading}
                variant="secondary"
                style={{ flex: '0 0 auto' }}
              >
                ✕ Abbrechen
              </Button>
            </>
          )}
        </div>
      </div>
      )}
      {loading && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: theme.colors.text.secondary }}>
          Wird verarbeitet...
        </div>
      )}
    </div>
  );
}

interface TournamentTablesProps {
  tournamentId: number;
  tournament: Tournament;
}

export default function TournamentTables({ tournamentId, tournament }: TournamentTablesProps) {
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupTable, setGroupTable] = useState<GroupTable | null>(null);
  const [tournamentStandings, setTournamentStandings] = useState<TournamentStandings | null>(null);
  const [qualificationTable, setQualificationTable] = useState<QualificationTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'groups' | 'overall' | 'qualification'>('groups');

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupTable();
    }
  }, [selectedGroupId]);

  const loadData = async () => {
    try {
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
        const standings = await tableService.getTournamentStandings(tournamentId);
        setTournamentStandings(standings);
      }
      
      // Load qualification table if tournament has KO phase and groups
      if (tournament.has_ko_phase && tournament.has_group_phase && tournament.ko_start_round) {
        try {
          const qualTable = await qualificationService.getQualificationTable(tournamentId);
          console.log('Qualification table loaded:', qualTable);
          setQualificationTable(qualTable);
        } catch (err: any) {
          console.error('Failed to load qualification table:', err);
          console.error('Error details:', err.response?.data || err.message);
          // Set to null to show error message
          setQualificationTable(null);
        }
      } else {
        // Reset qualification table if conditions not met
        setQualificationTable(null);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupTable = async () => {
    if (!selectedGroupId) return;
    
    try {
      const table = await tableService.getGroupTable(selectedGroupId);
      console.log('Group table data:', table);
      console.log('First row with won_decision_match:', table.table[0]?.won_decision_match);
      setGroupTable(table);
    } catch (err) {
      console.error('Failed to load group table:', err);
    }
  };

  if (loading) return <div style={{ color: theme.colors.text.secondary }}>Wird geladen...</div>;

  return (
    <div>
      {/* View Mode Selection */}
      {tournament.has_group_phase && tournament.has_ko_phase && (
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: theme.colors.text.primary }}>
            Ansicht:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              onClick={() => setViewMode('groups')}
              variant={viewMode === 'groups' ? 'info' : 'secondary'}
              style={{ fontWeight: viewMode === 'groups' ? 'bold' : 'normal' }}
            >
              Gruppen
            </Button>
            {tournament.ko_start_round && (
              <Button
                onClick={() => setViewMode('qualification')}
                variant={viewMode === 'qualification' ? 'warning' : 'secondary'}
                style={{ fontWeight: viewMode === 'qualification' ? 'bold' : 'normal' }}
              >
                Qualifikation
              </Button>
            )}
            <Button
              onClick={() => setViewMode('overall')}
              variant={viewMode === 'overall' ? 'danger' : 'secondary'}
              style={{ fontWeight: viewMode === 'overall' ? 'bold' : 'normal' }}
            >
              Gesamt
            </Button>
          </div>
        </div>
      )}

      {/* Group Tables */}
      {viewMode === 'groups' && tournament.has_group_phase && (
        <>
          {groups.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Noch keine Gruppen vorhanden.</p>
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
                    {group.name}
                  </Button>
                ))}
              </div>

              {groupTable && (
                <>
                  <div style={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
                    <h3 style={{ padding: '1rem', background: theme.colors.accent.primary, color: theme.colors.background.primary, margin: 0 }}>
                      {groupTable.group_name}
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: theme.colors.background.secondary }}>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Rang</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Sp</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>S</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>U</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>N</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LF</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>LA</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Diff</th>
                          {tournament.league_scoring_system === 'points' && (
                            <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, fontWeight: 'bold', color: theme.colors.text.primary }}>Pkt</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {groupTable.table.map((row, idx) => {
                        // Check if this row is the first in a tie group that needs a mini table
                        let isLastInTieGroup = false;
                        
                        if (row.is_in_tie_group && row.tie_group_size && row.tie_group_size > 2) {
                          // Find the tie group this participant belongs to
                          const participantTieGroup = groupTable.tie_break_mini_tables?.find(tbt => 
                            tbt.participant_ids.includes(row.participant_id)
                          );
                          
                          if (participantTieGroup) {
                            // Check if next row is also in this tie group
                            const nextRow = idx < groupTable.table.length - 1 ? groupTable.table[idx + 1] : null;
                            const nextRowInSameGroup = nextRow && participantTieGroup.participant_ids.includes(nextRow.participant_id);
                            
                            // This is the last row in the tie group if there's no next row in the same tie group
                            isLastInTieGroup = !nextRowInSameGroup;
                            
                            if (isLastInTieGroup) {
                              // Mini table will be displayed here
                            }
                          }
                        }
                        
                        return (
                          <tr key={row.participant_id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}`, background: idx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary }}>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: idx < 2 ? 'bold' : 'normal', color: idx < 2 ? theme.colors.accent.info : theme.colors.text.primary }}>
                              {row.rank}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>
                              {row.name}
                              {row.won_decision_match === true && (
                                <span style={{ color: theme.colors.accent.success, fontWeight: 'bold', marginLeft: '0.25rem' }} title="Gewinner des Entscheidungsspiels">*</span>
                              )}
                              {row.is_in_tie_group && (
                                <span style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginLeft: '0.25rem' }} title={`Gleichstand mit ${row.tie_group_size} Teilnehmern`}>
                                  ({row.tie_group_size})
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.games}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.wins}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{(row as any).draws ?? 0}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.losses}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.goals_for}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', color: theme.colors.text.primary }}>{row.goals_against}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: row.diff > 0 ? theme.colors.accent.success : row.diff < 0 ? theme.colors.accent.error : theme.colors.text.primary }}>
                              {row.diff > 0 ? '+' : ''}{row.diff}
                            </td>
                            {tournament.league_scoring_system === 'points' && (
                              <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.accent.info }}>
                                {row.points ?? 0}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                {/* Show mini tables directly under the main table */}
                {groupTable.tie_break_mini_tables && groupTable.tie_break_mini_tables.length > 0 && (
                  <MiniTableSection 
                    tieMiniTables={groupTable.tie_break_mini_tables}
                    tournament={tournament}
                    selectedGroupId={selectedGroupId}
                    onResolved={() => {
                      loadGroupTable();
                      loadData();
                    }}
                  />
                )}
              </>
              )}
            </>
          )}
        </>
      )}

      {/* Qualification Table */}
      {viewMode === 'qualification' && (
        <>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Wird geladen...</p>
            </div>
          ) : qualificationTable ? (
            <QualificationTableView 
              qualificationTable={qualificationTable}
              tournament={tournament}
              onRefresh={async () => {
                try {
                  const qualTable = await qualificationService.getQualificationTable(tournamentId);
                  setQualificationTable(qualTable);
                } catch (err) {
                  console.error('Failed to refresh qualification table:', err);
                }
              }}
            />
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Keine Qualifikationsdaten verfügbar.</p>
              <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary, marginTop: '0.5rem' }}>
                Stellen Sie sicher, dass:
              </p>
              <ul style={{ fontSize: '0.875rem', color: theme.colors.text.secondary, textAlign: 'left', display: 'inline-block', marginTop: '0.5rem' }}>
                <li>Das Turnier eine KO-Phase hat</li>
                <li>Das Turnier eine Gruppenphase hat</li>
                <li>Eine KO-Start-Runde konfiguriert ist</li>
                <li>Gruppen erstellt wurden</li>
              </ul>
            </div>
          )}
        </>
      )}

      {/* Tournament Standings */}
      {viewMode === 'overall' && tournament.has_ko_phase && (
        <>
          {tournamentStandings && tournamentStandings.standings.length > 0 ? (
            <div style={{ background: theme.colors.background.card, border: `1px solid ${theme.colors.border.standard}`, borderRadius: theme.borderRadius.card, overflow: 'hidden' }}>
              <h3 style={{ padding: '1rem', background: theme.colors.accent.error, color: theme.colors.text.primary, margin: 0 }}>
                Gesamtrangliste
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: theme.colors.background.secondary }}>
                    <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: `2px solid ${theme.colors.border.standard}`, width: '80px', color: theme.colors.text.primary }}>Rang</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: `2px solid ${theme.colors.border.standard}`, color: theme.colors.text.primary }}>Spieler</th>
                  </tr>
                </thead>
                <tbody>
                  {tournamentStandings.standings.map((standing, idx) => (
                    <tr key={standing.participant_id} style={{ borderBottom: `1px solid ${theme.colors.border.standard}`, background: idx % 2 === 0 ? theme.colors.background.card : theme.colors.background.secondary }}>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold', color: theme.colors.text.primary }}>
                        {standing.rank === 1 && '🥇'}
                        {standing.rank === 2 && '🥈'}
                        {standing.rank === 3 && '🥉'}
                        {' '}
                        {standing.rank}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'left', color: theme.colors.text.primary }}>{standing.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', background: theme.colors.background.card, borderRadius: theme.borderRadius.card, border: `1px solid ${theme.colors.border.standard}` }}>
              <p style={{ color: theme.colors.text.primary }}>Noch keine Gesamtrangliste verfügbar.</p>
              {tournamentStandings?.status === 'final_not_played' && (
                <p style={{ fontSize: '0.875rem', color: theme.colors.text.secondary, marginTop: '0.5rem' }}>
                  Das Finale muss zuerst gespielt werden.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

