// Tournament Tables Tab
import { useState, useEffect } from 'react';
import { Tournament } from '../../types';
import { tableService, GroupTable, TournamentStandings } from '../../services/tableService';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { qualificationService, QualificationTable } from '../../services/qualificationService';
import { cn } from '@/lib/utils';
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
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="mt-0 mb-4 text-foreground border-b-2 border-warning pb-2">
          Qualifikationsübersicht
        </h3>
        
        <div className="mb-6 text-muted-foreground text-sm">
          <div><strong>Qualifikationsplan:</strong></div>
          <div>Basis pro Gruppe: {qualificationTable.basis_per_group}</div>
          <div>Gesamt qualifiziert: {qualificationTable.qualified_count}</div>
          {qualificationTable.qualification_plan.remainder > 0 && (
            <div className="text-warning mt-2">
              ⚠️ Es qualifizieren sich zusätzlich die besten {qualificationTable.qualification_plan.remainder} Teilnehmer 
              aus Position {qualificationTable.basis_per_group + 1}
            </div>
          )}
        </div>

        {/* Group Qualifiers */}
        <div className="mb-8">
          <h4 className="text-foreground mb-4">Qualifizierte Teilnehmer (Basis)</h4>
          <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
            {qualificationTable.group_qualifiers.map((groupQual) => (
              <div 
                key={groupQual.group_id}
                className="bg-muted border border-border rounded-lg p-4"
              >
                <h5 className="mt-0 mb-3 text-primary text-base">
                  {groupQual.group_name}
                </h5>
                <div className="flex flex-col gap-2">
                  {groupQual.basis_qualifiers.map((qualifier) => (
                    <div 
                      key={qualifier.participant_id}
                      className={cn(
                        "p-2 rounded-md flex justify-between items-center",
                        qualifier.qualified 
                          ? "bg-card border-2 border-success" 
                          : "bg-card border border-border"
                      )}
                    >
                      <div>
                        <span className="font-bold text-foreground mr-2">
                          {qualifier.position}.
                        </span>
                        <span className="text-foreground">{qualifier.name}</span>
                        {qualifier.qualified && (
                          <span className="text-success font-bold ml-2">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
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
            <h4 className="text-foreground mb-4">
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
                className="bg-warning/10 border border-warning/40 rounded-lg p-4 mb-4"
              >
                <div className="font-bold text-foreground mb-3 text-sm">
                  Komplette Rangliste aller {rule.position}. Platzierten (Besten {rule.count} qualifizieren sich)
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left border-b border-border text-foreground">Rang</th>
                      <th className="p-2 text-left border-b border-border text-foreground">Status</th>
                      <th className="p-2 text-left border-b border-border text-foreground">Spieler</th>
                      <th className="p-2 text-left border-b border-border text-foreground">Gruppe</th>
                      <th className="p-2 text-center border-b border-border text-foreground">Diff</th>
                      <th className="p-2 text-center border-b border-border text-foreground">LF</th>
                      <th className="p-2 text-center border-b border-border text-foreground">LA</th>
                      {tournament.league_scoring_system === 'points' && (
                        <th className="p-2 text-center border-b border-border font-bold text-foreground">Pkt</th>
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
                          className={cn(
                            "border-b border-border",
                            isQualified 
                              ? "bg-success/20 border-l-4 border-l-success" 
                              : idx % 2 === 0 
                                ? "bg-card" 
                                : "bg-muted"
                          )}
                        >
                          <td className={cn(
                            "p-2 text-foreground text-center",
                            isQualified ? "font-bold" : ""
                          )}>
                            {idx + 1}.
                          </td>
                          <td className="p-2 text-center">
                            {isQualified ? (
                              <span className="text-success font-bold text-sm">
                                ✓ Qualifiziert
                              </span>
                            ) : isInQualificationRange ? (
                              <span className="text-warning text-xs">
                                Würde qualifizieren
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                Nicht qualifiziert
                              </span>
                            )}
                          </td>
                          <td className={cn("p-2 text-foreground", isQualified && "font-bold")}>
                            {candidate.name}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {candidate.group_name || `Gruppe ${candidate.group_id}`}
                          </td>
                          <td className={cn(
                            "p-2 text-center font-bold",
                            candidate.stats.diff > 0 ? "text-success" : candidate.stats.diff < 0 ? "text-destructive" : "text-foreground"
                          )}>
                            {candidate.stats.diff > 0 ? '+' : ''}{candidate.stats.diff}
                          </td>
                          <td className="p-2 text-center text-foreground">
                            {candidate.stats.goals_for}
                          </td>
                          <td className="p-2 text-center text-foreground">
                            {candidate.stats.goals_against}
                          </td>
                          {tournament.league_scoring_system === 'points' && (
                            <td className="p-2 text-center font-bold text-info">
                              {candidate.stats.points ?? 0}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {cutoffGroup.length > 0 && (
                  <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                    <div className="text-sm font-bold text-foreground mb-2">
                      Gleichstand um die letzten {rule.count} Plätze
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Bitte auswählen, wer sich qualifiziert (max. {rule.count}).
                    </div>
                    <div className="flex flex-col gap-2">
                      {cutoffGroup.map(pid => {
                        const candidate = candidateMap.get(pid);
                        if (!candidate) return null;
                        const isSelected = selectedIds.includes(pid);
                        return (
                          <label
                            key={pid}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer",
                              isSelected ? "bg-success/20" : "bg-muted"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleManualSelection(rule.position, pid, rule.count)}
                            />
                            <span className="text-foreground">
                              {candidate.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => handleSaveManualSelection(rule.position, rule.count)}
                        variant="success"
                        disabled={savingPosition === rule.position}
                        className="text-sm"
                      >
                        Auswahl speichern
                      </Button>
                      <Button
                        onClick={() => handleClearManualSelection(rule.position)}
                        variant="secondary"
                        disabled={savingPosition === rule.position || !hasManualSelection}
                        className="text-sm"
                      >
                        Zurücksetzen
                      </Button>
                    </div>
                    {hasManualSelection && (
                      <div className="mt-2 text-xs text-muted-foreground">
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
          <div className="p-4 bg-muted rounded-lg text-muted-foreground text-sm">
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
            className="mt-4 bg-card border border-border rounded-lg overflow-hidden"
          >
            {/* Collapsible header */}
            <div
              onClick={() => toggleTable(tableIndex)}
              className={cn(
                "px-4 py-3 bg-muted cursor-pointer flex items-center gap-2 select-none",
                isExpanded && "border-b border-border"
              )}
            >
              <span className="text-sm text-muted-foreground">
                {isExpanded ? '▾' : '▸'}
              </span>
              <span className="text-sm font-bold text-foreground">
                Direktbegegnungen (Minitabelle) - Gleichstand mit {_tieMiniTable.participant_ids.length} Teilnehmern
              </span>
              {_tieMiniTable.is_completely_tied && (
                <span className="text-xs text-destructive font-normal ml-2">
                  ⚠️ Komplett identisch!
                </span>
              )}
            </div>
            
            {/* Collapsible content */}
            {isExpanded && (
              <div className="p-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left border-b border-border text-foreground">Spieler</th>
                      <th className="p-2 text-center border-b border-border text-foreground">Sp</th>
                      <th className="p-2 text-center border-b border-border text-foreground">S</th>
                      <th className="p-2 text-center border-b border-border text-foreground">U</th>
                      <th className="p-2 text-center border-b border-border text-foreground">N</th>
                      <th className="p-2 text-center border-b border-border text-foreground">LF</th>
                      <th className="p-2 text-center border-b border-border text-foreground">LA</th>
                      <th className="p-2 text-center border-b border-border font-bold text-foreground">Diff</th>
                      {tournament.league_scoring_system === 'points' && (
                        <th className="p-2 text-center border-b border-border font-bold text-foreground">Pkt</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {_tieMiniTable.mini_table.map((miniRow, miniIdx) => (
                      <tr key={miniRow.participant_id} className={cn(
                        "border-b border-border",
                        miniIdx % 2 === 0 ? "bg-card" : "bg-muted"
                      )}>
                        <td className="p-2 text-left text-foreground font-medium">
                          {miniRow.name}
                        </td>
                        <td className="p-2 text-center text-foreground">{miniRow.games}</td>
                        <td className="p-2 text-center text-foreground">{miniRow.wins}</td>
                        <td className="p-2 text-center text-foreground">{miniRow.draws}</td>
                        <td className="p-2 text-center text-foreground">{miniRow.losses}</td>
                        <td className="p-2 text-center text-foreground">{miniRow.goals_for}</td>
                        <td className="p-2 text-center text-foreground">{miniRow.goals_against}</td>
                        <td className={cn(
                          "p-2 text-center font-bold",
                          miniRow.diff > 0 ? "text-success" : miniRow.diff < 0 ? "text-destructive" : "text-foreground"
                        )}>
                          {miniRow.diff > 0 ? '+' : ''}{miniRow.diff}
                        </td>
                        {tournament.league_scoring_system === 'points' && (
                          <td className="p-2 text-center font-bold text-info">
                            {miniRow.points ?? 0}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Show tie-break resolution options if completely tied */}
                {selectedGroupId && unresolvedGroups.length > 0 && (
                  <div className="mt-4 flex flex-col gap-4">
                    {unresolvedGroups.map((groupIds, idx) => (
                      <div key={`${tableIndex}-tie-${idx}`}>
                        <div className="text-sm text-muted-foreground mb-2">
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
    <div className="mt-4 p-4 bg-destructive/10 border border-destructive/40 rounded-lg">
      <div className="text-sm font-bold text-foreground mb-3">
        Gleichstand-Auflösung:
      </div>
      {true && (
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleGeneratePlayoff}
            disabled={loading}
            variant="info"
            className="w-full"
          >
            📅 Spielplan erstellen (jeder gegen jeden)
          </Button>
          
          <div className="flex gap-2 items-center">
            {!showManualSelection ? (
              <>
                <Button
                  onClick={() => setShowManualSelection(true)}
                  disabled={loading}
                  variant="secondary"
                  className="flex-1"
                >
                  👤 Manuell wählen
                </Button>
                <Button
                  onClick={handleRandomSelection}
                  disabled={loading}
                  variant="warning"
                  className="flex-1"
                >
                  🎲 Zufällig wählen
                </Button>
              </>
            ) : (
            <>
              <select
                value={selectedWinner || ''}
                onChange={(e) => setSelectedWinner(parseInt(e.target.value))}
                className="flex-1 py-2 text-sm border border-border rounded-md bg-muted text-foreground"
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
                className="flex-none"
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
                className="flex-none"
              >
                ✕ Abbrechen
              </Button>
            </>
          )}
        </div>
      </div>
      )}
      {loading && (
        <div className="mt-2 text-xs text-muted-foreground">
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
  const [viewMode, setViewMode] = useState<'groups' | 'qualification'>('groups');

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

  const showQualificationTab = tournament.has_ko_phase && tournament.has_group_phase && tournament.ko_start_round;

  useEffect(() => {
    if (!showQualificationTab && viewMode === 'qualification') {
      setViewMode('groups');
    }
  }, [showQualificationTab, viewMode]);

  if (loading) return <div className="text-muted-foreground">Wird geladen...</div>;

  return (
    <div>
      {/* View Mode Selection */}
      {showQualificationTab && (
        <div className="mb-8">
          <label className="block mb-2 font-bold text-foreground">
            Ansicht:
          </label>
          <div className="flex gap-2">
            <Button
              onClick={() => setViewMode('groups')}
              variant={viewMode === 'groups' ? 'info' : 'secondary'}
              className={cn(viewMode === 'groups' && 'font-bold')}
            >
              Gruppen
            </Button>
            <Button
              onClick={() => setViewMode('qualification')}
              variant={viewMode === 'qualification' ? 'warning' : 'secondary'}
              className={cn(viewMode === 'qualification' && 'font-bold')}
            >
              Qualifikation
            </Button>
          </div>
        </div>
      )}

      {/* Group Tables */}
      {viewMode === 'groups' && tournament.has_group_phase && (
        <>
          {groups.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border">
              <p className="text-foreground">Noch keine Gruppen vorhanden.</p>
            </div>
          ) : (
            <>
              {/* Group Tabs */}
              <div className="mb-8 flex gap-2 flex-wrap border-b-2 border-border pb-2">
                {groups.map(group => (
                  <Button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    variant={selectedGroupId === group.id ? 'primary' : 'secondary'}
                    className={cn(
                      'whitespace-nowrap rounded-t-lg',
                      selectedGroupId === group.id && 'font-bold border-b-2 border-b-primary -mb-0.5'
                    )}
                  >
                    {group.name}
                  </Button>
                ))}
              </div>

              {groupTable && (
                <>
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <h3 className="p-4 bg-primary text-primary-foreground m-0">
                      {groupTable.group_name}
                    </h3>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-3 text-center border-b-2 border-border text-foreground">Rang</th>
                          <th className="p-3 text-left border-b-2 border-border text-foreground">Spieler</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">Sp</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">S</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">U</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">N</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">LF</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">LA</th>
                          <th className="p-3 text-center border-b-2 border-border font-bold text-foreground">Diff</th>
                          {tournament.league_scoring_system === 'points' && (
                            <th className="p-3 text-center border-b-2 border-border font-bold text-foreground">Pkt</th>
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
                          <tr key={row.participant_id} className={cn(
                            "border-b border-border",
                            idx % 2 === 0 ? "bg-card" : "bg-muted"
                          )}>
                            <td className={cn(
                              "p-3 text-center",
                              idx < 2 ? "font-bold text-info" : "text-foreground"
                            )}>
                              {row.rank}
                            </td>
                            <td className="p-3 text-left text-foreground">
                              {row.name}
                              {row.won_decision_match === true && (
                                <span className="text-success font-bold ml-1" title="Gewinner des Entscheidungsspiels">*</span>
                              )}
                              {row.is_in_tie_group && (
                                <span className="text-xs text-muted-foreground ml-1" title={`Gleichstand mit ${row.tie_group_size} Teilnehmern`}>
                                  ({row.tie_group_size})
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center text-foreground">{row.games}</td>
                            <td className="p-3 text-center text-foreground">{row.wins}</td>
                            <td className="p-3 text-center text-foreground">{(row as any).draws ?? 0}</td>
                            <td className="p-3 text-center text-foreground">{row.losses}</td>
                            <td className="p-3 text-center text-foreground">{row.goals_for}</td>
                            <td className="p-3 text-center text-foreground">{row.goals_against}</td>
                            <td className={cn(
                              "p-3 text-center font-bold",
                              row.diff > 0 ? "text-success" : row.diff < 0 ? "text-destructive" : "text-foreground"
                            )}>
                              {row.diff > 0 ? '+' : ''}{row.diff}
                            </td>
                            {tournament.league_scoring_system === 'points' && (
                              <td className="p-3 text-center font-bold text-info">
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
                {tournament.has_ko_phase && (
                  <div className="mt-8">
                    {tournamentStandings && tournamentStandings.standings.length > 0 ? (
                      <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <h3 className="p-4 bg-destructive text-foreground m-0">
                          Gesamtrangliste
                        </h3>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-muted">
                              <th className="p-3 text-center border-b-2 border-border w-20 text-foreground">Rang</th>
                              <th className="p-3 text-left border-b-2 border-border text-foreground">Spieler</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tournamentStandings.standings.map((standing, idx) => (
                              <tr key={standing.participant_id} className={cn(
                                "border-b border-border",
                                idx % 2 === 0 ? "bg-card" : "bg-muted"
                              )}>
                                <td className="p-3 text-center font-bold text-foreground">
                                  {standing.rank === 1 && '🥇'}
                                  {standing.rank === 2 && '🥈'}
                                  {standing.rank === 3 && '🥉'}
                                  {' '}
                                  {standing.rank}
                                </td>
                                <td className="p-3 text-left text-foreground">{standing.name}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-card rounded-lg border border-border">
                        <p className="text-foreground">Noch keine Gesamtrangliste verfügbar.</p>
                        {tournamentStandings?.status === 'final_not_played' && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Das Finale muss zuerst gespielt werden.
                          </p>
                        )}
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

      {/* Qualification Table */}
      {viewMode === 'qualification' && (
        <>
          {loading ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border">
              <p className="text-foreground">Wird geladen...</p>
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
            <div className="p-8 text-center bg-card rounded-lg border border-border">
              <p className="text-foreground">Keine Qualifikationsdaten verfügbar.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Stellen Sie sicher, dass:
              </p>
              <ul className="text-sm text-muted-foreground text-left inline-block mt-2 list-disc">
                <li>Das Turnier eine KO-Phase hat</li>
                <li>Das Turnier eine Gruppenphase hat</li>
                <li>Eine KO-Start-Runde konfiguriert ist</li>
                <li>Gruppen erstellt wurden</li>
              </ul>
            </div>
          )}
        </>
      )}

    </div>
  );
}
