// KO Bracket Component - Visual Tournament Bracket Display
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KnockoutMatch } from '../../services/matchService';
import { Participant } from '../../types';
import { cn } from '@/lib/utils';
import { Button } from '../ui';
import { tableService } from '../../services/tableService';
import { tournamentService } from '../../services/tournamentService';

interface KOBracketProps {
  matches: KnockoutMatch[];
  participants: Participant[];
  onMatchEdit?: (matchId: number) => void;
  editingMatchId?: number | null;
  drawMode?: string | null;
  tournamentId?: number;
  koDistribution?: string | null;
  onRefresh?: () => void;
  presentationMode?: boolean;
}

export default function KOBracket({ matches, participants, onMatchEdit, editingMatchId: _editingMatchId, drawMode, tournamentId, koDistribution, onRefresh, presentationMode }: KOBracketProps) {
  const { t } = useTranslation();
  // Layout toggle state (Standard ab 4 Runden: linear, siehe defaultLinear unten)
  const [useLinearLayout, setUseLinearLayout] = useState<boolean | null>(null);
  // View mode: 'main' | 'consolation' | 'both' | 'left' | 'right' | 'full'
  const [viewMode, setViewMode] = useState<'main' | 'consolation' | 'both' | 'left' | 'right' | 'full'>('both');
  
  // Draw status for random_each_round mode
  const [drawStatus, setDrawStatus] = useState<{
    can_draw: boolean;
    reason?: string;
    current_round?: number;
    next_round?: number;
    winners_count?: number;
  } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  
  // Create participant map for quick lookup
  const participantMap = new Map<number, Participant>();
  participants.forEach(p => participantMap.set(p.id, p));

  // Helper function to get participant name
  const getParticipantName = (participantId: number | null, match?: KnockoutMatch, slot?: 1 | 2): string => {
    if (!participantId) {
      const usesManualSlots = drawMode === 'manual' || drawMode === 'predefined_slots';
      if (usesManualSlots && match && slot && match.round > 1 && match.round !== 99) {
        const sourceMatchNo = (match.match_no - 1) * 2 + slot;
        return `Sieger Spiel ${sourceMatchNo}`;
      }
      return '-';
    }
    const participant = participantMap.get(participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : '-';
  };

  // Separate matches by round (exclude bronze match for main bracket)
  const regularMatches = matches.filter(m => m.round !== 99 && m.round > 0);
  const bronzeMatch = matches.find(m => m.round === 99);
  const consolationMatches = matches.filter(m => m.round < 0);
  const hasConsolation = consolationMatches.length > 0;
  
  // State for main tournament standings (Endrangliste)
  const [mainStandings, setMainStandings] = useState<Array<{rank: number, participant_id: number, name: string}> | null>(null);
  // State for consolation standings
  const [consolationStandings, setConsolationStandings] = useState<Array<{rank: number, participant_id: number, name: string}> | null>(null);

  // Load main tournament standings when final is played (Endrangliste)
  useEffect(() => {
    if (tournamentId) {
      tableService.getTournamentStandings(tournamentId)
        .then(data => {
          if (data.standings && data.standings.length > 0) {
            setMainStandings(data.standings);
          } else {
            setMainStandings(null);
          }
        })
        .catch(() => setMainStandings(null));
    } else {
      setMainStandings(null);
    }
  }, [tournamentId, matches]);

  // Load consolation standings if tournament has consolation bracket
  useEffect(() => {
    if (hasConsolation && tournamentId) {
      tableService.getConsolationStandings(tournamentId)
        .then(data => {
          if (data.standings && data.standings.length > 0) {
            setConsolationStandings(data.standings);
          } else {
            setConsolationStandings(null);
          }
        })
        .catch(err => {
          console.error('Failed to load consolation standings:', err);
          setConsolationStandings(null);
        });
    } else {
      setConsolationStandings(null);
    }
  }, [hasConsolation, tournamentId, matches]);

  // Initialize view mode based on available brackets
  useEffect(() => {
    if (!hasConsolation && (viewMode === 'consolation' || viewMode === 'both')) {
      setViewMode('main');
    } else if (hasConsolation && viewMode === 'full') {
      setViewMode('both');
    }
  }, [hasConsolation]);

  // Check draw status for random_each_round mode
  const checkDrawStatus = useCallback(async () => {
    const randomEachRoundActive = drawMode === 'random_each_round' || koDistribution === 'random_each_round';
    if (!tournamentId || !randomEachRoundActive) {
      setDrawStatus(null);
      return;
    }
    
    try {
      const status = await tournamentService.getDrawStatus(tournamentId);
      setDrawStatus(status);
      setDrawError(null);
    } catch (err) {
      console.error('Failed to check draw status:', err);
      setDrawStatus(null);
    }
  }, [tournamentId, koDistribution, drawMode]);

  useEffect(() => {
    checkDrawStatus();
  }, [checkDrawStatus, matches]);

  // Handle manual draw for next round
  const handleDrawNextRound = async () => {
    if (!tournamentId || !drawStatus?.can_draw) return;
    
    setIsDrawing(true);
    setDrawError(null);
    
    try {
      const result = await tournamentService.drawNextRound(tournamentId);
      if (result.status === 'success') {
        // Refresh the bracket after successful draw
        if (onRefresh) {
          onRefresh();
        }
        // Re-check draw status
        await checkDrawStatus();
      }
    } catch (err: any) {
      console.error('Draw failed:', err);
      setDrawError(err.response?.data?.detail || t('common.error'));
    } finally {
      setIsDrawing(false);
    }
  };

  // Group matches by round (main bracket)
  const matchesByRound = new Map<number, KnockoutMatch[]>();
  regularMatches.forEach(match => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)!.push(match);
  });

  // Group consolation matches by round (negative rounds)
  const consolationByRound = new Map<number, KnockoutMatch[]>();
  consolationMatches.forEach(match => {
    if (!consolationByRound.has(match.round)) {
      consolationByRound.set(match.round, []);
    }
    consolationByRound.get(match.round)!.push(match);
  });

  // Sort rounds (highest round number = final)
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => b - a);
  const maxRound = rounds[0] || 1;
  
  // Sort consolation rounds (most negative = first consolation round)
  const consolationRounds = Array.from(consolationByRound.keys()).sort((a, b) => a - b);

  // Helper function to determine round label (Hauptturnier: nach Anzahl Spiele/Runde, z. B. 32er-KO mit 5 Runden)
  const getRoundLabel = (round: number): string => {
    if (round === 99) return 'Bronze';
    if (round < 0) {
      const absRound = Math.abs(round);
      // Determine if this is the final round (most negative round)
      const maxAbsRound = consolationRounds.length > 0 
        ? Math.max(...consolationRounds.map(r => Math.abs(r)))
        : absRound;
      const isFinal = absRound === maxAbsRound;
      
      if (isFinal) {
        return 'Trost Finale';
      } else {
        // For non-final rounds, determine label based on position
        // Count how many rounds come after this one
        const roundsAfter = consolationRounds.filter(r => Math.abs(r) > absRound).length;
        if (absRound === 1) {
          return 'Trost 1. Runde';
        } else if (roundsAfter === 1) {
          // This is the round before the final, so it's the semi-final
          return 'Trost Halbfinale';
        } else if (roundsAfter === 2) {
          // This is two rounds before the final, so it's the quarter-final
          return 'Trost Viertelfinale';
        } else {
          return `Trost Runde ${absRound}`;
        }
      }
    }
    const n = matchesByRound.get(round)?.length ?? 0;
    if (n <= 0) {
      return `Runde ${round}`;
    }
    const byMatchCount: Record<number, string> = {
      1: 'Finale',
      2: 'Halbfinale',
      4: 'Viertelfinale',
      8: 'Achtelfinale',
      16: 'Sechzehntelfinale',
    };
    return byMatchCount[n] ?? `Runde ${round} (${n} Spiele)`;
  };

  const getMatchResult = (match: KnockoutMatch | undefined | null) => {
    if (!match || match.score1 === null || match.score2 === null) return null;
    if (match.score1 === match.score2) return null;
    const player1Wins = match.score1 > match.score2;
    return {
      winnerId: player1Wins ? match.player1_id : match.player2_id,
      loserId: player1Wins ? match.player2_id : match.player1_id,
    };
  };

  // Render a single match box
  const renderMatchBox = (match: KnockoutMatch, round: number) => {
    const hasResult = match.score1 !== null && match.score2 !== null;
    // const isEditing = editingMatchId === match.id; // Reserved for future use
    const winnerId = hasResult && match.score1 !== null && match.score2 !== null
      ? (match.score1 > match.score2 ? match.player1_id : match.score2 > match.score1 ? match.player2_id : null)
      : null;

    return (
      <div
        key={match.id}
        className={cn(
          "relative w-full mb-3 bg-muted border-2 border-border rounded-lg transition-all duration-200 box-border",
          hasResult && "shadow-[0_2px_8px_rgba(37,99,235,0.25)]"
        )}
      >
        {/* Match Header */}
        <div
          className={cn(
            "py-1.5 px-2 text-[0.7rem] font-bold rounded-t-lg text-center",
            round === maxRound ? "bg-[#00CD00] text-[#000000]" : "bg-primary text-primary-foreground"
          )}
        >
          {round === maxRound ? 'Finale' : `Spiel ${match.match_no}`}
        </div>

        {/* Players */}
        <div className="p-2">
          {/* Player 1 */}
          <div className={cn(
            "py-1.5 px-2 mb-1 rounded-lg",
            winnerId === match.player1_id ? "bg-success/30 border-2 border-success font-bold" : "bg-card border border-border"
          )}>
            <div className="flex justify-between items-center gap-2">
              <span className="text-foreground text-[0.8rem] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                {getParticipantName(match.player1_id, match, 1)}
              </span>
              {hasResult && (
                <span className={cn(
                  "text-base font-bold flex-none",
                  winnerId === match.player1_id ? "text-success" : "text-muted-foreground"
                )}>
                  {match.score1}
                </span>
              )}
            </div>
          </div>

          {/* VS Separator */}
          <div className="text-center py-0.5 text-muted-foreground text-[0.65rem] font-bold">
            VS
          </div>

          {/* Player 2 */}
          <div className={cn(
            "py-1.5 px-2 rounded-lg",
            winnerId === match.player2_id ? "bg-success/30 border-2 border-success font-bold" : "bg-card border border-border"
          )}>
            <div className="flex justify-between items-center gap-2">
              <span className="text-foreground text-[0.8rem] overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">
                {getParticipantName(match.player2_id, match, 2)}
              </span>
              {hasResult && (
                <span className={cn(
                  "text-base font-bold flex-none",
                  winnerId === match.player2_id ? "text-success" : "text-muted-foreground"
                )}>
                  {match.score2}
                </span>
              )}
            </div>
          </div>

          {/* Edit Button */}
          {onMatchEdit && (
            <Button
              onClick={() => onMatchEdit(match.id)}
              variant={hasResult ? 'secondary' : 'info'}
              className="mt-1.5 w-full p-1.5 text-xs"
            >
              {hasResult ? t('tournament.koBracket.edit') : t('tournament.koBracket.enter')}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Noch keine KO-Spiele vorhanden.
      </div>
    );
  }

  // Standard: ab 4 KO-Runden „Linear“, damit alle Runden in einer Zeile sichtbar sind (horizontal scrollen)
  const defaultLinear = rounds.length >= 4;
  const actualUseLinear = useLinearLayout === null ? defaultLinear : useLinearLayout;
  const orderedRounds = [...rounds].sort((a, b) => a - b);

  // Split rounds into left and right halves (classic bracket)
  const splitRoundsIntoHalves = () => {
    const leftRounds: Array<{ round: number; matches: KnockoutMatch[] }> = [];
    const rightRounds: Array<{ round: number; matches: KnockoutMatch[] }> = [];
    const finalRound: Array<{ round: number; matches: KnockoutMatch[] }> = [];

    rounds.forEach((round) => {
      const roundMatches = matchesByRound.get(round) || [];
      const sortedMatches = [...roundMatches].sort((a, b) => a.match_no - b.match_no);
      
      if (round === maxRound) {
        // Final round goes in the center
        finalRound.push({ round, matches: sortedMatches });
      } else {
        // Split matches into left and right halves
        const midPoint = Math.ceil(sortedMatches.length / 2);
        const leftMatches = sortedMatches.slice(0, midPoint);
        const rightMatches = sortedMatches.slice(midPoint);
        
        leftRounds.push({ round, matches: leftMatches });
        rightRounds.push({ round, matches: rightMatches });
      }
    });

    // Reverse left rounds so they go from final towards first round (left side)
    leftRounds.reverse();
    
    return { leftRounds, rightRounds, finalRound };
  };

  const splitRounds = actualUseLinear ? null : splitRoundsIntoHalves();
  const finalMatch = actualUseLinear
    ? matchesByRound.get(maxRound)?.[0]
    : splitRounds?.finalRound[0]?.matches?.[0];
  const finalResult = getMatchResult(finalMatch);
  const bronzeResult = getMatchResult(bronzeMatch);
  const top4Placements = finalResult && bronzeResult ? [
    { rank: 1, participantId: finalResult.winnerId, label: presentationMode ? '1.' : '🥇' },
    { rank: 2, participantId: finalResult.loserId, label: presentationMode ? '2.' : '🥈' },
    { rank: 3, participantId: bronzeResult.winnerId, label: presentationMode ? '3.' : '🥉' },
    { rank: 4, participantId: bronzeResult.loserId, label: '4.' },
  ] : null;

  // Determine if we should show bracket split tabs (for large brackets in classic view)
  const showBracketSplitTabs = !actualUseLinear && rounds.length > 4;
  
  // Initialize view mode if needed
  if (!hasConsolation && (viewMode === 'consolation' || viewMode === 'both')) {
    // Reset to main if consolation doesn't exist
    if (viewMode === 'consolation' || viewMode === 'both') {
      // This will be handled by useEffect or we can set it here
    }
  }
  
  // Determine what to show based on view mode
  let shouldShowMain = true;
  let shouldShowConsolation = false;
  let shouldShowLeft = true;
  let shouldShowRight = true;
  let shouldShowFinal = true;
  
  // Determine bracket type view (main/consolation/both)
  if (hasConsolation) {
    if (viewMode === 'main' || viewMode === 'left' || viewMode === 'right' || viewMode === 'full') {
      shouldShowMain = true;
      shouldShowConsolation = false;
    } else if (viewMode === 'consolation') {
      shouldShowMain = false;
      shouldShowConsolation = true;
    } else if (viewMode === 'both') {
      shouldShowMain = true;
      shouldShowConsolation = true;
    }
  }
  
  // Determine bracket split view (left/right/full) - only applies to main bracket when not showing both
  if (showBracketSplitTabs && shouldShowMain && viewMode !== 'both') {
    if (viewMode === 'left') {
      shouldShowLeft = true;
      shouldShowRight = false;
      shouldShowFinal = false;
    } else if (viewMode === 'right') {
      shouldShowLeft = false;
      shouldShowRight = true;
      shouldShowFinal = false;
    } else if (viewMode === 'full') {
      shouldShowLeft = true;
      shouldShowRight = true;
      shouldShowFinal = true;
    }
    // For 'main' (when not left/right/full) - show full bracket
  }

  const isMainOrFull = (viewMode === 'full' || (!hasConsolation && viewMode === 'main') || (hasConsolation && viewMode === 'main'));

  return (
    <div className="p-4 bg-card rounded-lg border border-border w-full box-border">
      {/* Layout Toggle und Draw-Button – ausgeblendet im Präsentationsmodus */}
      {!presentationMode && (
      <>
      <div className="flex justify-between mb-4 gap-2 items-center flex-wrap">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Bracket Type Tabs (Main/Consolation/Both) */}
          {hasConsolation && (
            <>
              <span className="text-sm text-muted-foreground mr-1">
                {t('tournament.koBracket.tournament')}
              </span>
              <Button
                onClick={() => setViewMode('main')}
                variant={viewMode === 'main' ? 'primary' : 'secondary'}
                className={cn("py-1.5 px-3 text-sm", viewMode === 'main' && "font-bold")}
              >
                Hauptturnier
              </Button>
              <Button
                onClick={() => setViewMode('consolation')}
                variant={viewMode === 'consolation' ? 'primary' : 'secondary'}
                className={cn("py-1.5 px-3 text-sm", viewMode === 'consolation' && "font-bold")}
              >
                Trostturnier
              </Button>
              <Button
                onClick={() => setViewMode('both')}
                variant={viewMode === 'both' ? 'primary' : 'secondary'}
                className={cn("py-1.5 px-3 text-sm", viewMode === 'both' && "font-bold")}
              >
                Beides
              </Button>
            </>
          )}
          
          {/* Bracket Split Tabs (Left/Right/Full) - only for large brackets in classic view, and only when showing main bracket */}
          {showBracketSplitTabs && shouldShowMain && viewMode !== 'both' && (
            <>
              <span className={cn(
                "text-sm text-muted-foreground mr-1",
                hasConsolation && "ml-4"
              )}>
                Ansicht:
              </span>
              <Button
                onClick={() => setViewMode('left')}
                variant={viewMode === 'left' ? 'primary' : 'secondary'}
                className={cn("py-1.5 px-3 text-sm", viewMode === 'left' && "font-bold")}
              >
                Links
              </Button>
              <Button
                onClick={() => setViewMode('right')}
                variant={viewMode === 'right' ? 'primary' : 'secondary'}
                className={cn("py-1.5 px-3 text-sm", viewMode === 'right' && "font-bold")}
              >
                Rechts
              </Button>
              <Button
                onClick={() => setViewMode(hasConsolation ? 'main' : 'full')}
                variant={isMainOrFull ? 'primary' : 'secondary'}
                className={cn("py-1.5 px-3 text-sm", isMainOrFull && "font-bold")}
              >
                Gesamt
              </Button>
            </>
          )}
        </div>
        
        {/* Layout Style Toggle */}
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground mr-2">
            Layout:
          </span>
          <Button
            onClick={() => {
              setUseLinearLayout(false);
              // Reset view mode when switching to classic if needed
              if (hasConsolation && viewMode !== 'main' && viewMode !== 'consolation' && viewMode !== 'both') {
                setViewMode('both');
              }
            }}
            variant={!actualUseLinear ? 'primary' : 'secondary'}
            className={cn("py-1.5 px-3 text-sm", !actualUseLinear && "font-bold")}
          >
            Klassisch
          </Button>
          <Button
            onClick={() => {
              setUseLinearLayout(true);
              // Reset view mode when switching to linear
              if (hasConsolation && (viewMode === 'left' || viewMode === 'right' || viewMode === 'full')) {
                setViewMode('both');
              }
            }}
            variant={actualUseLinear ? 'primary' : 'secondary'}
            className={cn("py-1.5 px-3 text-sm", actualUseLinear && "font-bold")}
          >
            Linear
          </Button>
        </div>
        {rounds.length >= 4 && !actualUseLinear && (
          <p className="text-xs text-muted-foreground w-full mt-1 mb-0">
            Alle Runden: Layout „Linear“ wählen oder im Raster horizontal scrollen.
          </p>
        )}
      </div>

      {/* Draw Next Round Button (for random_each_round mode) */}
      {(drawMode === 'random_each_round' || koDistribution === 'random_each_round') && drawStatus && (
        <div className={cn(
          "mb-4 p-4 rounded-lg border",
          drawStatus.can_draw ? "bg-success/20 border-success" : "bg-muted border-border"
        )}>
          {drawStatus.can_draw ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="font-bold text-foreground mb-1">
                  Runde {drawStatus.current_round} abgeschlossen
                </div>
                <div className="text-sm text-muted-foreground">
                  {drawStatus.winners_count} Gewinner bereit für Runde {drawStatus.next_round}
                </div>
              </div>
              <Button
                onClick={handleDrawNextRound}
                disabled={isDrawing}
                variant="success"
                className="py-3 px-6 text-base font-bold"
              >
                {isDrawing ? t('tournament.matchesContent.drawInProgress') : t('tournament.matchesContent.drawRound', { round: drawStatus.next_round })}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              <strong>Modus:</strong> Jede Runde neu auslosen
              {drawStatus.reason && ` — ${drawStatus.reason}`}
            </div>
          )}
          {drawError && (
            <div className="mt-2 p-2 bg-destructive/20 rounded-md text-destructive text-sm">
              {drawError}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Main Bracket and Consolation Bracket */}
      <div className={cn(
        "flex gap-8 items-start",
        (hasConsolation && shouldShowConsolation && shouldShowMain) ? "flex-nowrap" : "flex-wrap"
      )}>
        {/* Main Bracket */}
        {shouldShowMain && (
          <div className={cn(
            "overflow-x-auto py-4",
            (hasConsolation && shouldShowConsolation) ? "flex-[1_1_50%] min-w-[400px]" : "flex-[1_1_100%] min-w-0"
          )}>
            {(hasConsolation || viewMode === 'main') && (
              <div className="text-center mb-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-base">
                Hauptturnier
              </div>
            )}
          <div className="flex justify-center items-start gap-4 w-max min-w-full flex-nowrap max-w-full">
        {actualUseLinear ? (
          <div className="flex gap-3 items-start">
            {orderedRounds.map(round => {
              const roundMatches = matchesByRound.get(round) || [];
              const sortedMatches = [...roundMatches].sort((a, b) => a.match_no - b.match_no);
              const isFinal = round === maxRound;
              return (
                <div
                  key={`round-${round}`}
                  className="flex flex-col justify-around min-w-[180px] max-w-[200px] flex-none"
                >
                  <div className={cn(
                    "text-center mb-2 py-2 rounded-lg font-bold text-sm",
                    isFinal ? "bg-[#00CD00] text-[#000000]" : "bg-primary text-primary-foreground"
                  )}>
                    {getRoundLabel(round)}
                  </div>

                  <div>
                    {sortedMatches.map(match => renderMatchBox(match, round))}
                  </div>

                  {isFinal && top4Placements && (
                    <div className="mt-3 bg-muted border border-border rounded-lg p-3">
                      <div className="text-center font-bold text-foreground text-sm mb-2">
                        {'Pl\u00E4tze 1-4'}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {top4Placements.map(entry => (
                          <div
                            key={entry.rank}
                            className="flex justify-between items-center py-1.5 px-2 bg-card rounded-lg border border-border text-xs text-foreground"
                          >
                            <span className="font-bold">{entry.label}</span>
                            <span className="overflow-hidden text-ellipsis whitespace-nowrap ml-2 flex-1 text-right">
                              {getParticipantName(entry.participantId)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Left Half */}
            {(shouldShowLeft || shouldShowFinal) && (
              <div className="flex gap-3 items-start flex-none min-w-0 justify-end">
                {splitRounds?.leftRounds.map(({ round, matches }) => (
                <div
                  key={`left-${round}`}
                  className="flex flex-col justify-around min-w-[180px] max-w-[200px] flex-none"
                >
                  {/* Round Header */}
                  <div className="text-center mb-2 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">
                    {getRoundLabel(round)}
                  </div>

                  {/* Matches in this round */}
                  <div>
                    {matches.map(match => renderMatchBox(match, round))}
                  </div>
                </div>
              ))}
              </div>
            )}

            {/* Final Round (Center) */}
            {shouldShowFinal && splitRounds?.finalRound.map(({ round, matches }) => (
              <div
                key={`final-${round}`}
                className="flex flex-col justify-center min-w-[180px] max-w-[200px] flex-none"
              >
                {/* Round Header */}
                <div className="text-center mb-2 py-2 bg-[#00CD00] text-[#000000] rounded-lg font-bold text-sm">
                  {getRoundLabel(round)}
                </div>

                {/* Matches in this round */}
                <div>
                  {matches.map(match => renderMatchBox(match, round))}
                </div>

                {top4Placements && (
                  <div className="mt-3 bg-muted border border-border rounded-lg p-3">
                    <div className="text-center font-bold text-foreground text-sm mb-2">
                      Plätze 1–4
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {top4Placements.map(entry => (
                        <div
                          key={entry.rank}
                          className="flex justify-between items-center py-1.5 px-2 bg-card rounded-lg border border-border text-xs text-foreground"
                        >
                          <span className="font-bold">{entry.label}</span>
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap ml-2 flex-1 text-right">
                            {getParticipantName(entry.participantId)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Right Half */}
            {(shouldShowRight || shouldShowFinal) && (
              <div className="flex gap-3 items-start flex-none min-w-0 justify-start">
                {splitRounds?.rightRounds.map(({ round, matches }) => (
                <div
                  key={`right-${round}`}
                  className="flex flex-col justify-around min-w-[180px] max-w-[200px] flex-none"
                >
                  {/* Round Header */}
                  <div className="text-center mb-2 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm">
                    {getRoundLabel(round)}
                  </div>

                  {/* Matches in this round */}
                  <div>
                    {matches.map(match => renderMatchBox(match, round))}
                  </div>
                </div>
              ))}
              </div>
            )}
          </>
        )}
          </div>
          </div>
        )}

        {/* Consolation Bracket */}
        {shouldShowConsolation && (
          <div className={cn(
            "overflow-x-auto py-4",
            shouldShowMain ? "flex-[1_1_50%] min-w-[400px]" : "flex-[1_1_100%] min-w-0"
          )}>
            <div className="text-center mb-4 py-2 bg-warning text-warning-foreground rounded-lg font-bold text-base">
              Trostturnier
            </div>
            <div className="flex justify-center items-start gap-3 w-max min-w-full flex-nowrap">
              {consolationRounds.map(round => {
                const roundMatches = consolationByRound.get(round) || [];
                const sortedMatches = [...roundMatches].sort((a, b) => a.match_no - b.match_no);
                const absRound = Math.abs(round);
                const isFinal = absRound === consolationRounds.map(r => Math.abs(r)).sort((a, b) => b - a)[0];
                return (
                  <div
                    key={`consolation-round-${round}`}
                    className="flex flex-col justify-around min-w-[180px] max-w-[200px] flex-none"
                  >
                    <div className={cn(
                      "text-center mb-2 py-2 rounded-lg font-bold text-sm",
                      isFinal ? "bg-warning text-warning-foreground" : "bg-info text-info-foreground"
                    )}>
                      {getRoundLabel(round)}
                    </div>
                    <div>
                      {sortedMatches.map(match => renderMatchBox(match, round))}
                    </div>
                    
                    {/* Endrangliste Hauptturnier nach dem Finale */}
                    {isFinal && mainStandings && mainStandings.length > 0 && (
                      <div className="mt-3 bg-muted border border-border rounded-lg p-3">
                        <div className="text-center font-bold text-foreground text-sm mb-2">
                          Endrangliste
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {mainStandings.map((standing: {rank: number, participant_id: number, name: string}) => (
                            <div
                              key={standing.participant_id}
                              className="flex justify-between items-center py-1.5 px-2 bg-card rounded-lg border border-border text-xs text-foreground"
                            >
                              <span className="font-bold">
                                {standing.rank === 1 && '🥇'}
                                {standing.rank === 2 && '🥈'}
                                {standing.rank === 3 && '🥉'}
                                {' '}
                                {standing.rank}.
                              </span>
                              <span className="overflow-hidden text-ellipsis whitespace-nowrap ml-2 flex-1 text-right">
                                {standing.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show consolation standings after final */}
                    {isFinal && consolationStandings && consolationStandings.length > 0 && (
                      <div className="mt-3 bg-muted border border-border rounded-lg p-3">
                        <div className="text-center font-bold text-foreground text-sm mb-2">
                          Trostturnier Rangliste
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {consolationStandings.slice(0, 8).map((standing: {rank: number, participant_id: number, name: string}) => (
                            <div
                              key={standing.participant_id}
                              className="flex justify-between items-center py-1.5 px-2 bg-card rounded-lg border border-border text-xs text-foreground"
                            >
                              <span className="font-bold">
                                {standing.rank === 1 && '🥇'}
                                {standing.rank === 2 && '🥈'}
                                {standing.rank === 3 && '🥉'}
                                {' '}
                                {standing.rank}.
                              </span>
                              <span className="overflow-hidden text-ellipsis whitespace-nowrap ml-2 flex-1 text-right">
                                {standing.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bronze Match (if exists) */}
      {bronzeMatch && (
        <div className="mt-6 pt-4 border-t-2 border-warning text-center w-full">
          <div className="mb-3 py-2 bg-warning text-warning-foreground rounded-lg font-bold text-sm inline-block max-w-[200px]">
            Spiel um Platz 3
          </div>
          <div className="flex justify-center max-w-[200px] mx-auto">
            {renderMatchBox(bronzeMatch, 99)}
          </div>
        </div>
      )}
    </div>
  );
}
