// Tournament Tables Tab
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tournament } from '../../types';
import { tableService, GroupTable, TournamentStandings } from '../../services/tableService';
import { groupService, GroupWithParticipants } from '../../services/groupService';
import { qualificationService, QualificationTable } from '../../services/qualificationService';
import { cn } from '@/lib/utils';
import { Button } from '../ui';

/** Entspricht backend compute_manual_selection_required: noch zu wählende Plätze im Gleichstand. */
function computeManualSelectionRequired(
  count: number,
  orderedIds: number[],
  cutoffTieGroup: number[]
): number {
  if (!cutoffTieGroup.length || count <= 0) return 0;
  const tieSet = new Set(cutoffTieGroup);
  const clearInTop = orderedIds.slice(0, count).filter((id) => !tieSet.has(id));
  return Math.max(0, count - clearInTop.length);
}

// Qualification Table View Component
interface QualificationTableViewProps {
  qualificationTable: QualificationTable;
  tournament: Tournament;
  onRefresh: () => void;
}

function QualificationTableView({ qualificationTable, tournament, onRefresh }: QualificationTableViewProps) {
  const { t } = useTranslation();
  const [manualSelections, setManualSelections] = useState<Record<number, number[]>>({});
  const [savingPosition, setSavingPosition] = useState<number | null>(null);

  useEffect(() => {
    const initialSelections: Record<number, number[]> = {};
    qualificationTable.fallback_candidates.forEach((rule) => {
      const cutoffGroup = rule.cutoff_tie_group || [];
      const orderedIds = rule.candidates.map((c) => c.participant_id);
      const manualRequired = computeManualSelectionRequired(rule.count, orderedIds, cutoffGroup);
      if (manualRequired > 0 && rule.manual_selected_ids?.length) {
        const inTie = rule.manual_selected_ids.filter((id) => cutoffGroup.includes(id));
        initialSelections[rule.position] = inTie.slice(0, manualRequired);
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

  const handleSaveManualSelection = async (position: number, requiredManual: number) => {
    const selectedIds = manualSelections[position] || [];
    if (requiredManual > 0 && selectedIds.length !== requiredManual) {
      alert(t('tournament.tables.selectParticipants', { count: requiredManual }));
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
      alert(`${t('tournament.tables.resetError')}: ${error.response?.data?.detail || error.message}`);
    } finally {
      setSavingPosition(null);
    }
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-lg p-6 mb-8">
        <h3 className="mt-0 mb-4 text-foreground border-b-2 border-warning pb-2">
          {t('liveTicker.qualificationOverview')}
        </h3>
        
        <div className="mb-6 text-muted-foreground text-sm">
          <div><strong>{t('liveTicker.qualificationPlan')}</strong></div>
          <div>{t('tournament.tables.basisPerGroup', { count: qualificationTable.basis_per_group })}</div>
          <div>{t('liveTicker.qualifiedTotal', { count: qualificationTable.qualified_count })}</div>
          {qualificationTable.qualification_plan.remainder > 0 && (
            <div className="text-warning mt-2">
              ⚠️ {t('tournament.tables.additionalQualify', { count: qualificationTable.qualification_plan.remainder, position: qualificationTable.basis_per_group + 1 })}
            </div>
          )}
        </div>

        {/* Group Qualifiers */}
        <div className="mb-8">
          <h4 className="text-foreground mb-4">{t('tournament.tables.qualifiedBasis')}</h4>
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
              {t('liveTicker.additionalQualifiers')}
            </h4>
            {qualificationTable.fallback_candidates.map((rule, ruleIdx) => {
              const cutoffGroup = rule.cutoff_tie_group || [];
              const orderedIds = rule.candidates.map((c) => c.participant_id);
              /** Immer aus cutoff + Rangliste berechnen (identisch zum Backend, unabhängig vom Deploy-Stand). */
              const manualRequired = computeManualSelectionRequired(rule.count, orderedIds, cutoffGroup);
              const candidateMap = new Map(rule.candidates.map(c => [c.participant_id, c]));
              const selectedIds = manualSelections[rule.position] || [];
              const hasManualSelection = rule.manual_selected_ids && rule.manual_selected_ids.length > 0;

              return (
              <div 
                key={ruleIdx}
                className="bg-warning/10 border border-warning/40 rounded-lg p-4 mb-4"
              >
                <div className="font-bold text-foreground mb-3 text-sm">
                  {t('liveTicker.fullRankingOfPosition', { position: rule.position, count: rule.count })}
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left border-b border-border text-foreground">{t('common.rank')}</th>
                      <th className="p-2 text-left border-b border-border text-foreground">{t('common.status')}</th>
                      <th className="p-2 text-left border-b border-border text-foreground">{t('common.table.player')}</th>
                      <th className="p-2 text-left border-b border-border text-foreground">{t('tournament.tables.group')}</th>
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
                                ✓ {t('tournament.tables.qualified')}
                              </span>
                            ) : isInQualificationRange ? (
                              <span className="text-warning text-xs">
                                {t('liveTicker.wouldQualify')}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                {t('liveTicker.notQualified')}
                              </span>
                            )}
                          </td>
                          <td className={cn("p-2 text-foreground", isQualified && "font-bold")}>
                            {candidate.name}
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {candidate.group_name || `${t('tournament.tables.group')} ${candidate.group_id}`}
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

                {cutoffGroup.length > 0 && manualRequired > 0 && (
                  <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                    <div className="text-sm font-bold text-foreground mb-2">
                      Gleichstand: noch {manualRequired} {manualRequired === 1 ? 'Platz' : 'Plätze'} zu vergeben
                    </div>
                    <div className="text-xs text-muted-foreground mb-3">
                      Bitte genau {manualRequired} {manualRequired === 1 ? 'Teilnehmer' : 'Teilnehmer'} auswählen (insgesamt {rule.count} Zusatzplätze an dieser Position).
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
                              onChange={() => toggleManualSelection(rule.position, pid, manualRequired)}
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
                        onClick={() => handleSaveManualSelection(rule.position, manualRequired)}
                        variant="success"
                        disabled={savingPosition === rule.position}
                        className="text-sm"
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        onClick={() => handleClearManualSelection(rule.position)}
                        variant="secondary"
                        disabled={savingPosition === rule.position || !hasManualSelection}
                        className="text-sm"
                      >
                      {t('tournament.tables.reset')}
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
            {t('liveTicker.noAdditionalRequired')}
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
  const { t } = useTranslation();
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
                {t('tournament.tables.tieBreakMini', { count: _tieMiniTable.participant_ids.length })}
              </span>
              {_tieMiniTable.is_completely_tied && (
                <span className="text-xs text-destructive font-normal ml-2">
                  ⚠️ {t('liveTicker.completelyTied')}
                </span>
              )}
            </div>
            
            {/* Collapsible content */}
            {isExpanded && (
              <div className="p-4">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="p-2 text-left border-b border-border text-foreground">{t('common.table.player')}</th>
                      <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.games')}</th>
                      <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.wins')}</th>
                      <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.draws')}</th>
                      <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.losses')}</th>
                      <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.goalsFor')}</th>
                      <th className="p-2 text-center border-b border-border text-foreground">{t('common.table.goalsAgainst')}</th>
                      <th className="p-2 text-center border-b border-border font-bold text-foreground">{t('common.table.diff')}</th>
                      {tournament.league_scoring_system === 'points' && (
                        <th className="p-2 text-center border-b border-border font-bold text-foreground">{t('common.table.pts')}</th>
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
                          {t('tournament.tables.openTie')} ({t('tournament.tables.tieGroupSize', { count: groupIds.length })})
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
  const { t } = useTranslation();
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
      alert(t('tournament.tables.scheduleCreated'));
      onResolved();
    } catch (error: any) {
      alert(`Fehler beim Erstellen des Spielplans: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRandomSelection = async () => {
    if (!confirm(t('tournament.tables.chooseRandomWinner'))) {
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
      alert(t('tournament.tables.selectWinner'));
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
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupWithParticipants[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupTable, setGroupTable] = useState<GroupTable | null>(null);
  const [tournamentStandings, setTournamentStandings] = useState<TournamentStandings | null>(null);
  const [qualificationTable, setQualificationTable] = useState<QualificationTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'groups' | 'qualification'>('groups');

  const getRequiredParticipants = (): number => {
    switch (tournament.ko_start_round) {
      case 'round_of_32':
        return 32;
      case 'round_of_16':
        return 16;
      case 'quarterfinal':
        return 8;
      case 'semifinal':
        return 4;
      case 'final':
        return 2;
      default:
        return 0;
    }
  };

  const buildQualificationFallback = async (
    allGroups: GroupWithParticipants[]
  ): Promise<QualificationTable | null> => {
    if (!allGroups.length || !tournament.ko_start_round) return null;
    const requiredParticipants = getRequiredParticipants();
    if (requiredParticipants <= 0) return null;

    const basisPerGroup = Math.floor(requiredParticipants / allGroups.length);
    const remainder = requiredParticipants % allGroups.length;

    const groupTables = await Promise.all(
      allGroups.map(async (g) => ({
        group: g,
        table: await tableService.getGroupTable(g.id),
      }))
    );

    const groupQualifiers = groupTables.map(({ group, table }) => {
      const basisRows = table.table.slice(0, basisPerGroup);
      return {
        group_id: group.id,
        group_name: group.name,
        basis_qualifiers: basisRows.map((row) => ({
          participant_id: row.participant_id,
          name: row.name,
          group_id: group.id,
          group_name: group.name,
          position: row.rank,
          qualified: true,
          stats: {
            points: row.points,
            diff: row.diff,
            goals_for: row.goals_for,
            goals_against: row.goals_against,
          },
        })),
      };
    });

    const allBasisIds = new Set<number>();
    groupQualifiers.forEach((gq) => gq.basis_qualifiers.forEach((q) => allBasisIds.add(q.participant_id)));

    const fallbackCandidatesRaw = groupTables
      .flatMap(({ group, table }) =>
        table.table
          .filter((row) => row.rank === basisPerGroup + 1)
          .map((row) => ({
            participant_id: row.participant_id,
            name: row.name,
            group_id: group.id,
            group_name: group.name,
            position: row.rank,
            qualified: false,
            stats: {
              points: row.points,
              diff: row.diff,
              goals_for: row.goals_for,
              goals_against: row.goals_against,
            },
          }))
      )
      .sort((a, b) => {
        if (tournament.league_scoring_system === 'points') {
          const p = (b.stats.points ?? 0) - (a.stats.points ?? 0);
          if (p !== 0) return p;
        }
        const d = b.stats.diff - a.stats.diff;
        if (d !== 0) return d;
        const gf = b.stats.goals_for - a.stats.goals_for;
        if (gf !== 0) return gf;
        return a.stats.goals_against - b.stats.goals_against;
      });

    const count = Math.max(0, remainder);
    const sortedIds = fallbackCandidatesRaw.map((c) => c.participant_id);
    const tieKey = (c: (typeof fallbackCandidatesRaw)[0]) => {
      if (tournament.league_scoring_system === 'points') {
        return `${c.stats.points ?? 0}|${c.stats.diff}|${c.stats.goals_for}|${c.stats.goals_against}`;
      }
      return `${c.stats.diff}|${c.stats.goals_for}|${c.stats.goals_against}`;
    };
    const tieGroups = new Map<string, number[]>();
    for (const c of fallbackCandidatesRaw) {
      const k = tieKey(c);
      if (!tieGroups.has(k)) tieGroups.set(k, []);
      tieGroups.get(k)!.push(c.participant_id);
    }
    const topIds = new Set(sortedIds.slice(0, count));
    let cutoff_tie_group: number[] = [];
    for (const ids of tieGroups.values()) {
      if (ids.length && ids.some((id) => topIds.has(id)) && ids.some((id) => !topIds.has(id))) {
        cutoff_tie_group = ids;
        break;
      }
    }
    const manual_selection_required = computeManualSelectionRequired(count, sortedIds, cutoff_tie_group);

    const selectedFallbackIds = fallbackCandidatesRaw
      .slice(0, count)
      .map((c) => c.participant_id);
    const selectedFallbackSet = new Set(selectedFallbackIds);
    const fallbackCandidates = fallbackCandidatesRaw.map((c) => ({
      ...c,
      qualified: selectedFallbackSet.has(c.participant_id),
    }));

    const allQualifiedParticipants = [...allBasisIds, ...selectedFallbackIds];

    return {
      tournament_id: tournamentId,
      qualification_plan: {
        required_participants: requiredParticipants,
        basis_per_group: basisPerGroup,
        remainder,
        fallback_rules: remainder > 0 ? [{ position: basisPerGroup + 1, count: remainder, selection: 'best' }] : [],
      },
      basis_per_group: basisPerGroup,
      qualified_count: allQualifiedParticipants.length,
      group_qualifiers: groupQualifiers,
      fallback_candidates: remainder > 0 ? [{
        position: basisPerGroup + 1,
        count: remainder,
        selection: 'best',
        candidates: fallbackCandidates,
        cutoff_tie_group,
        manual_selection_required,
      }] : [],
      all_qualified_participants: allQualifiedParticipants,
    };
  };

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
      let fullGroups: GroupWithParticipants[] = [];
      if (tournament.has_group_phase) {
        const groupsData = await groupService.getGroups(tournamentId);
        fullGroups = await Promise.all(
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
          setQualificationTable(qualTable);
        } catch (err: any) {
          console.warn('Qualification endpoint unavailable, using fallback:', err?.response?.status || err?.message);
          const fallbackTable = await buildQualificationFallback(fullGroups);
          setQualificationTable(fallbackTable);
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
  const basisQualifiersCount =
    showQualificationTab
      ? (qualificationTable?.basis_per_group ?? (groups.length > 0 ? Math.floor(getRequiredParticipants() / groups.length) : 0))
      : 0;

  useEffect(() => {
    if (!showQualificationTab || viewMode !== 'qualification') return;
    const refreshQualification = async () => {
      try {
        const qualTable = await qualificationService.getQualificationTable(tournamentId);
        setQualificationTable(qualTable);
      } catch {
        const fallbackTable = await buildQualificationFallback(groups);
        setQualificationTable(fallbackTable);
      }
    };
    refreshQualification();
    const interval = window.setInterval(refreshQualification, 15000);
    return () => window.clearInterval(interval);
  }, [viewMode, showQualificationTab, tournamentId, groups.length, tournament.ko_start_round]);

  useEffect(() => {
    if (!showQualificationTab && viewMode === 'qualification') {
      setViewMode('groups');
    }
  }, [showQualificationTab, viewMode]);

  if (loading) return <div className="text-muted-foreground">{t('common.loading')}</div>;

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
              {t('tournament.participants.groups')}
            </Button>
            <Button
              onClick={() => setViewMode('qualification')}
              variant={viewMode === 'qualification' ? 'warning' : 'secondary'}
              className={cn(viewMode === 'qualification' && 'font-bold')}
            >
              {t('settings.slides.qualification')}
            </Button>
          </div>
        </div>
      )}

      {/* Group Tables */}
      {viewMode === 'groups' && tournament.has_group_phase && (
        <>
          {groups.length === 0 ? (
            <div className="p-8 text-center bg-card rounded-lg border border-border">
              <p className="text-foreground">{t('tournament.tables.noGroups')}</p>
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
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.rank')}</th>
                          <th className="p-3 text-left border-b-2 border-border text-foreground">{t('common.table.player')}</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.games')}</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.wins')}</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.draws')}</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.losses')}</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.goalsFor')}</th>
                          <th className="p-3 text-center border-b-2 border-border text-foreground">{t('common.table.goalsAgainst')}</th>
                          <th className="p-3 text-center border-b-2 border-border font-bold text-foreground">{t('common.table.diff')}</th>
                          {tournament.league_scoring_system === 'points' && (
                            <th className="p-3 text-center border-b-2 border-border font-bold text-foreground">{t('common.table.pts')}</th>
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
                              basisQualifiersCount > 0 && row.rank <= basisQualifiersCount
                                ? "font-bold text-info"
                                : "text-foreground"
                            )}>
                              {row.rank}
                            </td>
                            <td className="p-3 text-left text-foreground">
                              {row.name}
                              {row.won_decision_match === true && (
                                <span className="text-success font-bold ml-1" title={t('tournament.tables.decisionMatchWinner')}>*</span>
                              )}
                              {row.is_in_tie_group && (
                                <span className="text-xs text-muted-foreground ml-1" title={t('tournament.tables.tieGroupSize', { count: row.tie_group_size })}>
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
                          {t('league.detail.overallRanking')}
                        </h3>
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-muted">
                              <th className="p-3 text-center border-b-2 border-border w-20 text-foreground">{t('common.rank')}</th>
                              <th className="p-3 text-left border-b-2 border-border text-foreground">{t('common.table.player')}</th>
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
              <p className="text-foreground">{t('common.loading')}</p>
            </div>
          ) : qualificationTable ? (
            <QualificationTableView 
              qualificationTable={qualificationTable}
              tournament={tournament}
              onRefresh={async () => {
                try {
                  const qualTable = await qualificationService.getQualificationTable(tournamentId);
                  setQualificationTable(qualTable);
                } catch {
                  const fallbackTable = await buildQualificationFallback(groups);
                  setQualificationTable(fallbackTable);
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
