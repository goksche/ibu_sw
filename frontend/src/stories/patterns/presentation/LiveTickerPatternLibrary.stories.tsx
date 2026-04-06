import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  LiveTickerSlideGroups,
  LiveTickerSlideKO,
  LiveTickerSlideQualification,
  LiveTickerSlideTitle,
} from '@/components/patterns/presentation/LiveTickerSlides';
import { KnockoutMatch } from '@/services/matchService';
import { Participant } from '@/types';

const meta: Meta = {
  title: 'Patterns/Presentation/Library',
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

const participants = [
  { id: 1, first_name: 'Thomas', last_name: 'Indergang' },
  { id: 2, first_name: 'Roger', last_name: 'Baumann' },
  { id: 3, first_name: 'Erkan', last_name: 'Cokicli' },
  { id: 4, first_name: 'Luca', last_name: 'Gisler' },
] as Participant[];

const koMatches = [
  {
    id: 1,
    round: 1,
    match_no: 1,
    player1_id: 1,
    player2_id: 4,
    score1: 2,
    score2: 0,
  },
  {
    id: 2,
    round: 1,
    match_no: 2,
    player1_id: 2,
    player2_id: 3,
    score1: 1,
    score2: 2,
  },
] as KnockoutMatch[];

export const SlideStates: Story = {
  render: () => (
    <div className="min-h-screen bg-background p-8 text-foreground space-y-10">
      <LiveTickerSlideTitle
        tournamentName="Vereinsturnier Winter 2026"
        subtitle="LiveTicker"
        refreshHint="Automatische Aktualisierung alle 30 Sekunden"
      />

      <LiveTickerSlideGroups title="Gruppenübersicht" subtitle="8 Spiele offen">
        <div className="rounded-lg border border-border bg-card p-6 text-xl">
          Distanz-Lesbarkeit: große Typografie, klare Kontraste, luftige Abstände.
        </div>
      </LiveTickerSlideGroups>

      <LiveTickerSlideQualification title="Qualifikation" subtitle="Top 8 für KO qualifiziert">
        <div className="text-lg text-muted-foreground">
          Qualifikationsmatrix mit Tie-Break-Hinweisen und Status-Badges.
        </div>
      </LiveTickerSlideQualification>

      <LiveTickerSlideKO
        title="KO-Phase"
        subtitle="Halbfinale"
        matches={koMatches}
        participants={participants}
        tournamentId={1}
        drawMode={null}
        koDistribution={null}
      />
    </div>
  ),
};
