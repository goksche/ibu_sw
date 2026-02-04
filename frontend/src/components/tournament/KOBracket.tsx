// KO Bracket Component - Visual Tournament Bracket Display
import { useState, useEffect, useCallback } from 'react';
import { KnockoutMatch } from '../../services/matchService';
import { Participant } from '../../types';
import { theme } from '../../theme/theme';
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
  // Layout toggle state (default to linear for brackets with >4 rounds)
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
      if (drawMode === 'predefined_slots' && match && slot && match.round > 1 && match.round !== 99) {
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
    if (!tournamentId || koDistribution !== 'random_each_round') {
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
  }, [tournamentId, koDistribution]);

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
      setDrawError(err.response?.data?.detail || 'Auslosung fehlgeschlagen');
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

  // Helper function to determine round label
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
    const labels: Record<number, string> = {
      1: '1. Runde',
      2: 'Viertelfinale',
      3: 'Halbfinale',
      4: 'Finale'
    };
    return labels[round] || `Runde ${round}`;
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
        style={{
          position: 'relative',
          width: '100%',
          marginBottom: '12px',
          background: theme.colors.background.secondary,
          border: `2px solid ${theme.colors.border.standard}`,
          borderRadius: theme.borderRadius.card,
          boxShadow: hasResult ? `0 2px 8px ${theme.colors.accent.info}40` : theme.shadows.card,
          transition: 'all 0.2s ease',
          boxSizing: 'border-box'
        }}
      >
        {/* Match Header */}
        <div style={{
          padding: '0.375rem 0.5rem',
          background: round === maxRound ? theme.colors.accent.error : theme.colors.accent.primary,
          color: round === maxRound ? theme.colors.text.primary : theme.colors.background.primary,
          fontSize: '0.7rem',
          fontWeight: 'bold',
          borderRadius: `${theme.borderRadius.card} ${theme.borderRadius.card} 0 0`,
          textAlign: 'center'
        }}>
          {round === maxRound ? 'Finale' : `Spiel ${match.match_no}`}
        </div>

        {/* Players */}
        <div style={{ padding: '0.5rem' }}>
          {/* Player 1 */}
          <div style={{
            padding: '0.375rem 0.5rem',
            marginBottom: '0.25rem',
            background: winnerId === match.player1_id ? `${theme.colors.accent.success}30` : theme.colors.background.card,
            border: winnerId === match.player1_id ? `2px solid ${theme.colors.accent.success}` : `1px solid ${theme.colors.border.standard}`,
            borderRadius: theme.borderRadius.card,
            fontWeight: winnerId === match.player1_id ? 'bold' : 'normal'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ 
                color: theme.colors.text.primary, 
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: '1',
                minWidth: '0'
              }}>
                {getParticipantName(match.player1_id, match, 1)}
              </span>
              {hasResult && (
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: winnerId === match.player1_id ? theme.colors.accent.success : theme.colors.text.secondary,
                  flex: '0 0 auto'
                }}>
                  {match.score1}
                </span>
              )}
            </div>
          </div>

          {/* VS Separator */}
          <div style={{
            textAlign: 'center',
            padding: '0.125rem 0',
            color: theme.colors.text.secondary,
            fontSize: '0.65rem',
            fontWeight: 'bold'
          }}>
            VS
          </div>

          {/* Player 2 */}
          <div style={{
            padding: '0.375rem 0.5rem',
            background: winnerId === match.player2_id ? `${theme.colors.accent.success}30` : theme.colors.background.card,
            border: winnerId === match.player2_id ? `2px solid ${theme.colors.accent.success}` : `1px solid ${theme.colors.border.standard}`,
            borderRadius: theme.borderRadius.card,
            fontWeight: winnerId === match.player2_id ? 'bold' : 'normal'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ 
                color: theme.colors.text.primary, 
                fontSize: '0.8rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: '1',
                minWidth: '0'
              }}>
                {getParticipantName(match.player2_id, match, 2)}
              </span>
              {hasResult && (
                <span style={{
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: winnerId === match.player2_id ? theme.colors.accent.success : theme.colors.text.secondary,
                  flex: '0 0 auto'
                }}>
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
              fullWidth
              style={{ marginTop: '0.375rem', padding: '0.375rem', fontSize: '0.75rem' }}
            >
              {hasResult ? 'Ändern' : 'Eintragen'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: theme.colors.text.secondary }}>
        Noch keine KO-Spiele vorhanden.
      </div>
    );
  }

  // Initialize layout preference (default to linear for brackets with >4 rounds)
  const defaultLinear = rounds.length > 4;
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

  return (
    <div style={{ 
      padding: '1rem',
      background: theme.colors.background.card,
      borderRadius: theme.borderRadius.card,
      border: `1px solid ${theme.colors.border.standard}`,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Layout Toggle und Draw-Button – ausgeblendet im Präsentationsmodus */}
      {!presentationMode && (
      <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '1rem',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Bracket Type Tabs (Main/Consolation/Both) */}
          {hasConsolation && (
            <>
              <span style={{ 
                fontSize: '0.875rem', 
                color: theme.colors.text.secondary,
                marginRight: '0.25rem'
              }}>
                Turnier:
              </span>
              <Button
                onClick={() => setViewMode('main')}
                variant={viewMode === 'main' ? 'primary' : 'secondary'}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  fontSize: '0.875rem',
                  fontWeight: viewMode === 'main' ? 'bold' : 'normal'
                }}
              >
                Hauptturnier
              </Button>
              <Button
                onClick={() => setViewMode('consolation')}
                variant={viewMode === 'consolation' ? 'primary' : 'secondary'}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  fontSize: '0.875rem',
                  fontWeight: viewMode === 'consolation' ? 'bold' : 'normal'
                }}
              >
                Trostturnier
              </Button>
              <Button
                onClick={() => setViewMode('both')}
                variant={viewMode === 'both' ? 'primary' : 'secondary'}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  fontSize: '0.875rem',
                  fontWeight: viewMode === 'both' ? 'bold' : 'normal'
                }}
              >
                Beides
              </Button>
            </>
          )}
          
          {/* Bracket Split Tabs (Left/Right/Full) - only for large brackets in classic view, and only when showing main bracket */}
          {showBracketSplitTabs && shouldShowMain && viewMode !== 'both' && (
            <>
              <span style={{ 
                fontSize: '0.875rem', 
                color: theme.colors.text.secondary,
                marginLeft: hasConsolation ? '1rem' : '0',
                marginRight: '0.25rem'
              }}>
                Ansicht:
              </span>
              <Button
                onClick={() => setViewMode('left')}
                variant={viewMode === 'left' ? 'primary' : 'secondary'}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  fontSize: '0.875rem',
                  fontWeight: viewMode === 'left' ? 'bold' : 'normal'
                }}
              >
                Links
              </Button>
              <Button
                onClick={() => setViewMode('right')}
                variant={viewMode === 'right' ? 'primary' : 'secondary'}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  fontSize: '0.875rem',
                  fontWeight: viewMode === 'right' ? 'bold' : 'normal'
                }}
              >
                Rechts
              </Button>
              <Button
                onClick={() => setViewMode(hasConsolation ? 'main' : 'full')}
                variant={(viewMode === 'full' || (!hasConsolation && viewMode === 'main') || (hasConsolation && viewMode === 'main')) ? 'primary' : 'secondary'}
                style={{ 
                  padding: '0.375rem 0.75rem', 
                  fontSize: '0.875rem',
                  fontWeight: (viewMode === 'full' || (!hasConsolation && viewMode === 'main') || (hasConsolation && viewMode === 'main')) ? 'bold' : 'normal'
                }}
              >
                Gesamt
              </Button>
            </>
          )}
        </div>
        
        {/* Layout Style Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.875rem', 
            color: theme.colors.text.secondary,
            marginRight: '0.5rem'
          }}>
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
            style={{ 
              padding: '0.375rem 0.75rem', 
              fontSize: '0.875rem',
              fontWeight: !actualUseLinear ? 'bold' : 'normal'
            }}
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
            style={{ 
              padding: '0.375rem 0.75rem', 
              fontSize: '0.875rem',
              fontWeight: actualUseLinear ? 'bold' : 'normal'
            }}
          >
            Linear
          </Button>
        </div>
      </div>

      {/* Draw Next Round Button (for random_each_round mode) */}
      {koDistribution === 'random_each_round' && drawStatus && (
        <div style={{ 
          marginBottom: '1rem',
          padding: '1rem',
          background: drawStatus.can_draw ? theme.colors.accent.success + '20' : theme.colors.background.secondary,
          borderRadius: theme.borderRadius.card,
          border: `1px solid ${drawStatus.can_draw ? theme.colors.accent.success : theme.colors.border.standard}`
        }}>
          {drawStatus.can_draw ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: theme.colors.text.primary, marginBottom: '0.25rem' }}>
                  Runde {drawStatus.current_round} abgeschlossen
                </div>
                <div style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                  {drawStatus.winners_count} Gewinner bereit für Runde {drawStatus.next_round}
                </div>
              </div>
              <Button
                onClick={handleDrawNextRound}
                disabled={isDrawing}
                variant="success"
                style={{ 
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {isDrawing ? 'Auslosung läuft...' : `Runde ${drawStatus.next_round} auslosen`}
              </Button>
            </div>
          ) : (
            <div style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>
              <strong>Modus:</strong> Jede Runde neu auslosen
              {drawStatus.reason && ` — ${drawStatus.reason}`}
            </div>
          )}
          {drawError && (
            <div style={{ 
              marginTop: '0.5rem', 
              padding: '0.5rem', 
              background: theme.colors.accent.error + '20',
              borderRadius: theme.borderRadius.input,
              color: theme.colors.accent.error,
              fontSize: '0.875rem'
            }}>
              {drawError}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* Main Bracket and Consolation Bracket */}
      <div style={{ 
        display: 'flex', 
        gap: '2rem', 
        alignItems: 'flex-start',
        flexWrap: (hasConsolation && shouldShowConsolation && shouldShowMain) ? 'nowrap' : 'wrap'
      }}>
        {/* Main Bracket */}
        {shouldShowMain && (
          <div style={{ 
            flex: (hasConsolation && shouldShowConsolation) ? '1 1 50%' : '1 1 100%',
            overflowX: 'auto', 
            padding: '1rem 0',
            minWidth: (hasConsolation && shouldShowConsolation) ? '400px' : '0'
          }}>
            {(hasConsolation || viewMode === 'main') && (
              <div style={{
                textAlign: 'center',
                marginBottom: '1rem',
                padding: '0.5rem',
                background: theme.colors.accent.primary,
                color: theme.colors.background.primary,
                borderRadius: theme.borderRadius.card,
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                Hauptturnier
              </div>
            )}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '1rem',
            width: 'max-content',
            minWidth: '100%',
            flexWrap: 'nowrap',
            maxWidth: '100%'
          }}>
        {actualUseLinear ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            {orderedRounds.map(round => {
              const roundMatches = matchesByRound.get(round) || [];
              const sortedMatches = [...roundMatches].sort((a, b) => a.match_no - b.match_no);
              const isFinal = round === maxRound;
              return (
                <div
                  key={`round-${round}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    minWidth: '180px',
                    maxWidth: '200px',
                    flex: '0 0 auto'
                  }}
                >
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: isFinal ? theme.colors.accent.error : theme.colors.accent.primary,
                    color: isFinal ? theme.colors.text.primary : theme.colors.background.primary,
                    borderRadius: theme.borderRadius.card,
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
                    {getRoundLabel(round)}
                  </div>

                  <div>
                    {sortedMatches.map(match => renderMatchBox(match, round))}
                  </div>

                  {isFinal && top4Placements && (
                    <div style={{
                      marginTop: '0.75rem',
                      background: theme.colors.background.secondary,
                      border: `1px solid ${theme.colors.border.standard}`,
                      borderRadius: theme.borderRadius.card,
                      padding: '0.75rem'
                    }}>
                      <div style={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: theme.colors.text.primary,
                        fontSize: '0.8rem',
                        marginBottom: '0.5rem'
                      }}>
                        {'Pl\u00E4tze 1-4'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {top4Placements.map(entry => (
                          <div
                            key={entry.rank}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.35rem 0.5rem',
                              background: theme.colors.background.card,
                              borderRadius: theme.borderRadius.card,
                              border: `1px solid ${theme.colors.border.standard}`,
                              fontSize: '0.75rem',
                              color: theme.colors.text.primary
                            }}
                          >
                            <span style={{ fontWeight: 'bold' }}>{entry.label}</span>
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              marginLeft: '0.5rem',
                              flex: '1',
                              textAlign: 'right'
                            }}>
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
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                flex: '0 0 auto',
                minWidth: '0',
                justifyContent: 'flex-end'
              }}>
                {splitRounds?.leftRounds.map(({ round, matches }) => (
                <div
                  key={`left-${round}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    minWidth: '180px',
                    maxWidth: '200px',
                    flex: '0 0 auto'
                  }}
                >
                  {/* Round Header */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: theme.colors.accent.primary,
                    color: theme.colors.background.primary,
                    borderRadius: theme.borderRadius.card,
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
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
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minWidth: '180px',
                  maxWidth: '200px',
                  flex: '0 0 auto'
                }}
              >
                {/* Round Header */}
                <div style={{
                  textAlign: 'center',
                  marginBottom: '0.5rem',
                  padding: '0.5rem',
                  background: theme.colors.accent.error,
                  color: theme.colors.text.primary,
                  borderRadius: theme.borderRadius.card,
                  fontWeight: 'bold',
                  fontSize: '0.875rem'
                }}>
                  {getRoundLabel(round)}
                </div>

                {/* Matches in this round */}
                <div>
                  {matches.map(match => renderMatchBox(match, round))}
                </div>

                {top4Placements && (
                  <div style={{
                    marginTop: '0.75rem',
                    background: theme.colors.background.secondary,
                    border: `1px solid ${theme.colors.border.standard}`,
                    borderRadius: theme.borderRadius.card,
                    padding: '0.75rem'
                  }}>
                    <div style={{
                      textAlign: 'center',
                      fontWeight: 'bold',
                      color: theme.colors.text.primary,
                      fontSize: '0.8rem',
                      marginBottom: '0.5rem'
                    }}>
                      Plätze 1–4
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {top4Placements.map(entry => (
                        <div
                          key={entry.rank}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.35rem 0.5rem',
                            background: theme.colors.background.card,
                            borderRadius: theme.borderRadius.card,
                            border: `1px solid ${theme.colors.border.standard}`,
                            fontSize: '0.75rem',
                            color: theme.colors.text.primary
                          }}
                        >
                          <span style={{ fontWeight: 'bold' }}>{entry.label}</span>
                          <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginLeft: '0.5rem',
                            flex: '1',
                            textAlign: 'right'
                          }}>
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
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'flex-start',
                flex: '0 0 auto',
                minWidth: '0',
                justifyContent: 'flex-start'
              }}>
                {splitRounds?.rightRounds.map(({ round, matches }) => (
                <div
                  key={`right-${round}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-around',
                    minWidth: '180px',
                    maxWidth: '200px',
                    flex: '0 0 auto'
                  }}
                >
                  {/* Round Header */}
                  <div style={{
                    textAlign: 'center',
                    marginBottom: '0.5rem',
                    padding: '0.5rem',
                    background: theme.colors.accent.primary,
                    color: theme.colors.background.primary,
                    borderRadius: theme.borderRadius.card,
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
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
          <div style={{ 
            flex: shouldShowMain ? '1 1 50%' : '1 1 100%',
            overflowX: 'auto', 
            padding: '1rem 0',
            minWidth: shouldShowMain ? '400px' : '0'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '1rem',
              padding: '0.5rem',
              background: theme.colors.accent.warning,
              color: theme.colors.background.primary,
              borderRadius: theme.borderRadius.card,
              fontWeight: 'bold',
              fontSize: '1rem'
            }}>
              Trostturnier
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start',
              gap: '0.75rem',
              width: 'max-content',
              minWidth: '100%',
              flexWrap: 'nowrap'
            }}>
              {consolationRounds.map(round => {
                const roundMatches = consolationByRound.get(round) || [];
                const sortedMatches = [...roundMatches].sort((a, b) => a.match_no - b.match_no);
                const absRound = Math.abs(round);
                const isFinal = absRound === consolationRounds.map(r => Math.abs(r)).sort((a, b) => b - a)[0];
                return (
                  <div
                    key={`consolation-round-${round}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-around',
                      minWidth: '180px',
                      maxWidth: '200px',
                      flex: '0 0 auto'
                    }}
                  >
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '0.5rem',
                      padding: '0.5rem',
                      background: isFinal ? theme.colors.accent.warning : theme.colors.accent.info,
                      color: theme.colors.background.primary,
                      borderRadius: theme.borderRadius.card,
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      {getRoundLabel(round)}
                    </div>
                    <div>
                      {sortedMatches.map(match => renderMatchBox(match, round))}
                    </div>
                    
                    {/* Endrangliste Hauptturnier nach dem Finale */}
                    {isFinal && mainStandings && mainStandings.length > 0 && (
                      <div style={{
                        marginTop: '0.75rem',
                        background: theme.colors.background.secondary,
                        border: `1px solid ${theme.colors.border.standard}`,
                        borderRadius: theme.borderRadius.card,
                        padding: '0.75rem'
                      }}>
                        <div style={{
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: theme.colors.text.primary,
                          fontSize: '0.8rem',
                          marginBottom: '0.5rem'
                        }}>
                          Endrangliste
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {mainStandings.map((standing: {rank: number, participant_id: number, name: string}) => (
                            <div
                              key={standing.participant_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.35rem 0.5rem',
                                background: theme.colors.background.card,
                                borderRadius: theme.borderRadius.card,
                                border: `1px solid ${theme.colors.border.standard}`,
                                fontSize: '0.75rem',
                                color: theme.colors.text.primary
                              }}
                            >
                              <span style={{ fontWeight: 'bold' }}>
                                {standing.rank === 1 && '🥇'}
                                {standing.rank === 2 && '🥈'}
                                {standing.rank === 3 && '🥉'}
                                {' '}
                                {standing.rank}.
                              </span>
                              <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginLeft: '0.5rem',
                                flex: '1',
                                textAlign: 'right'
                              }}>
                                {standing.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show consolation standings after final */}
                    {isFinal && consolationStandings && consolationStandings.length > 0 && (
                      <div style={{
                        marginTop: '0.75rem',
                        background: theme.colors.background.secondary,
                        border: `1px solid ${theme.colors.border.standard}`,
                        borderRadius: theme.borderRadius.card,
                        padding: '0.75rem'
                      }}>
                        <div style={{
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: theme.colors.text.primary,
                          fontSize: '0.8rem',
                          marginBottom: '0.5rem'
                        }}>
                          Trostturnier Rangliste
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {consolationStandings.slice(0, 8).map((standing: {rank: number, participant_id: number, name: string}) => (
                            <div
                              key={standing.participant_id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.35rem 0.5rem',
                                background: theme.colors.background.card,
                                borderRadius: theme.borderRadius.card,
                                border: `1px solid ${theme.colors.border.standard}`,
                                fontSize: '0.75rem',
                                color: theme.colors.text.primary
                              }}
                            >
                              <span style={{ fontWeight: 'bold' }}>
                                {standing.rank === 1 && '🥇'}
                                {standing.rank === 2 && '🥈'}
                                {standing.rank === 3 && '🥉'}
                                {' '}
                                {standing.rank}.
                              </span>
                              <span style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginLeft: '0.5rem',
                                flex: '1',
                                textAlign: 'right'
                              }}>
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
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: `2px solid ${theme.colors.accent.warning}`,
          textAlign: 'center',
          width: '100%'
        }}>
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.5rem',
            background: theme.colors.accent.warning,
            color: theme.colors.background.primary,
            borderRadius: theme.borderRadius.card,
            fontWeight: 'bold',
            fontSize: '0.875rem',
            display: 'inline-block',
            maxWidth: '200px'
          }}>
            Spiel um Platz 3
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', maxWidth: '200px', margin: '0 auto' }}>
            {renderMatchBox(bronzeMatch, 99)}
          </div>
        </div>
      )}
    </div>
  );
}

