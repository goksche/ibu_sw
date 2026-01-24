// KO Bracket Component - Visual Tournament Bracket Display
import { KnockoutMatch } from '../../services/matchService';
import { Participant } from '../../types';

interface KOBracketProps {
  matches: KnockoutMatch[];
  participants: Participant[];
  onMatchEdit?: (matchId: number) => void;
  editingMatchId?: number | null;
}

export default function KOBracket({ matches, participants, onMatchEdit, editingMatchId }: KOBracketProps) {
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
    const isEditing = editingMatchId === match.id;
    const winnerId = hasResult && match.score1 !== null && match.score2 !== null
      ? (match.score1 > match.score2 ? match.player1_id : match.score2 > match.score1 ? match.player2_id : null)
      : null;

    return (
      <div
        key={match.id}
        style={{
          position: 'relative',
          minWidth: '200px',
          marginBottom: '20px',
          background: 'white',
          border: '2px solid #dee2e6',
          borderRadius: '8px',
          boxShadow: hasResult ? '0 2px 8px rgba(0,123,255,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Match Header */}
        <div style={{
          padding: '0.5rem',
          background: round === maxRound ? '#dc3545' : '#6c757d',
          color: 'white',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          borderRadius: '6px 6px 0 0',
          textAlign: 'center'
        }}>
          {getRoundLabel(round)} - Spiel {match.match_no}
        </div>

        {/* Players */}
        <div style={{ padding: '0.75rem' }}>
          {/* Player 1 */}
          <div style={{
            padding: '0.5rem',
            marginBottom: '0.25rem',
            background: winnerId === match.player1_id ? '#d4edda' : '#f8f9fa',
            border: winnerId === match.player1_id ? '2px solid #28a745' : '1px solid #dee2e6',
            borderRadius: '4px',
            fontWeight: winnerId === match.player1_id ? 'bold' : 'normal'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{getParticipantName(match.player1_id)}</span>
              {hasResult && (
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: winnerId === match.player1_id ? '#28a745' : '#6c757d',
                  minWidth: '30px',
                  textAlign: 'right'
                }}>
                  {match.score1}
                </span>
              )}
            </div>
          </div>

          {/* VS Separator */}
          <div style={{
            textAlign: 'center',
            padding: '0.25rem 0',
            color: '#6c757d',
            fontSize: '0.75rem',
            fontWeight: 'bold'
          }}>
            VS
          </div>

          {/* Player 2 */}
          <div style={{
            padding: '0.5rem',
            background: winnerId === match.player2_id ? '#d4edda' : '#f8f9fa',
            border: winnerId === match.player2_id ? '2px solid #28a745' : '1px solid #dee2e6',
            borderRadius: '4px',
            fontWeight: winnerId === match.player2_id ? 'bold' : 'normal'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{getParticipantName(match.player2_id)}</span>
              {hasResult && (
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  color: winnerId === match.player2_id ? '#28a745' : '#6c757d',
                  minWidth: '30px',
                  textAlign: 'right'
                }}>
                  {match.score2}
                </span>
              )}
            </div>
          </div>

          {/* Edit Button */}
          {onMatchEdit && (
            <button
              onClick={() => onMatchEdit(match.id)}
              style={{
                width: '100%',
                marginTop: '0.5rem',
                padding: '0.5rem',
                background: hasResult ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 'bold'
              }}
            >
              {hasResult ? 'Ergebnis ändern' : 'Ergebnis eintragen'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (matches.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
        Noch keine KO-Spiele vorhanden.
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem',
      background: '#f8f9fa',
      borderRadius: '8px',
      overflowX: 'auto'
    }}>
      {/* Main Bracket */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        minWidth: 'fit-content',
        padding: '2rem 0'
      }}>
        {rounds.map((round, roundIndex) => {
          const roundMatches = matchesByRound.get(round) || [];
          const sortedMatches = [...roundMatches].sort((a, b) => a.match_no - b.match_no);
          
          return (
            <div
              key={round}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                minWidth: '220px'
              }}
            >
              {/* Round Header */}
              <div style={{
                textAlign: 'center',
                marginBottom: '1rem',
                padding: '0.75rem',
                background: round === maxRound ? '#dc3545' : '#6c757d',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                {getRoundLabel(round)}
              </div>

              {/* Matches in this round */}
              <div>
                {sortedMatches.map(match => renderMatchBox(match, round))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bronze Match (if exists) */}
      {bronzeMatch && (
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '3px solid #ffc107',
          textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: '#ffc107',
            color: '#212529',
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '1rem',
            display: 'inline-block',
            minWidth: '220px'
          }}>
            Spiel um Platz 3
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderMatchBox(bronzeMatch, 99)}
          </div>
        </div>
      )}
    </div>
  );
}

