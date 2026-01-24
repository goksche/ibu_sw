// KO Bracket Component - Visual Tournament Bracket Display
import { KnockoutMatch } from '../../services/matchService';
import { Participant } from '../../types';
import { theme } from '../../theme/theme';
import { Button } from '../ui';

interface KOBracketProps {
  matches: KnockoutMatch[];
  participants: Participant[];
  onMatchEdit?: (matchId: number) => void;
  editingMatchId?: number | null;
}

export default function KOBracket({ matches, participants, onMatchEdit, editingMatchId: _editingMatchId }: KOBracketProps) {
  // Create participant map for quick lookup
  const participantMap = new Map<number, Participant>();
  participants.forEach(p => participantMap.set(p.id, p));

  // Helper function to get participant name
  const getParticipantName = (participantId: number | null): string => {
    if (!participantId) return '-';
    const participant = participantMap.get(participantId);
    return participant ? `${participant.first_name} ${participant.last_name}` : '-';
  };

  // Separate matches by round (exclude bronze match for main bracket)
  const regularMatches = matches.filter(m => m.round !== 99);
  const bronzeMatch = matches.find(m => m.round === 99);

  // Group matches by round
  const matchesByRound = new Map<number, KnockoutMatch[]>();
  regularMatches.forEach(match => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)!.push(match);
  });

  // Sort rounds (highest round number = final)
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => b - a);
  const maxRound = rounds[0] || 1;

  // Helper function to determine round label
  const getRoundLabel = (round: number): string => {
    if (round === 99) return 'Bronze';
    const labels: Record<number, string> = {
      1: '1. Runde',
      2: 'Viertelfinale',
      3: 'Halbfinale',
      4: 'Finale'
    };
    return labels[round] || `Runde ${round}`;
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
                {getParticipantName(match.player1_id)}
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
                {getParticipantName(match.player2_id)}
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

  // Split rounds into left and right halves
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

  const { leftRounds, rightRounds, finalRound } = splitRoundsIntoHalves();

  return (
    <div style={{ 
      padding: '1rem',
      background: theme.colors.background.card,
      borderRadius: theme.borderRadius.card,
      border: `1px solid ${theme.colors.border.standard}`,
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Main Bracket - Split into Left and Right */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        gap: '1rem',
        width: '100%',
        padding: '1rem 0',
        flexWrap: 'wrap',
        maxWidth: '100%'
      }}>
        {/* Left Half */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          flex: '1 1 auto',
          minWidth: '0',
          justifyContent: 'flex-end'
        }}>
          {leftRounds.map(({ round, matches }) => (
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

        {/* Final Round (Center) */}
        {finalRound.map(({ round, matches }) => (
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
          </div>
        ))}

        {/* Right Half */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
          flex: '1 1 auto',
          minWidth: '0',
          justifyContent: 'flex-start'
        }}>
          {rightRounds.map(({ round, matches }) => (
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

