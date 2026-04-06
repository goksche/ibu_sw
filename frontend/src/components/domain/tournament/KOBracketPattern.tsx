import { KnockoutMatch } from '@/services/matchService';
import { Participant } from '@/types';
import KOBracket from '@/components/tournament/KOBracket';

interface KOBracketPatternProps {
  matches: KnockoutMatch[];
  participants: Participant[];
  tournamentId: number;
  drawMode?: string | null;
  koDistribution?: string | null;
  mode: 'management' | 'presentation';
}

export default function KOBracketPattern({
  matches,
  participants,
  tournamentId,
  drawMode,
  koDistribution,
  mode,
}: KOBracketPatternProps) {
  return (
    <div className={mode === 'presentation' ? 'rounded-lg border border-border bg-card p-4' : 'rounded-lg border border-border p-3'}>
      <KOBracket
        matches={matches}
        participants={participants}
        tournamentId={tournamentId}
        drawMode={drawMode}
        koDistribution={koDistribution}
        presentationMode={mode === 'presentation'}
      />
    </div>
  );
}
