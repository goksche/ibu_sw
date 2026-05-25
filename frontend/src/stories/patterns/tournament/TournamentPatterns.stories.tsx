import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Badge } from '@/components/ui';
import { Trophy } from 'phosphor-react';
import TournamentSectionHeader from '@/components/patterns/tournament/TournamentSectionHeader';
import MatchListPattern from '@/components/patterns/tournament/MatchListPattern';
import StandingTablePattern from '@/components/patterns/tournament/StandingTablePattern';
import KOBracketPattern from '@/components/domain/tournament/KOBracketPattern';
import { KnockoutMatch } from '@/services/matchService';
import { Participant } from '@/types';

const meta: Meta = {
  title: 'Patterns/Tournament/Library',
  parameters: { layout: 'padded' },
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

export const SectionHeaderAndMatchList: Story = {
  render: () => (
    <div className="space-y-6">
      <TournamentSectionHeader
        title="Gruppenphase"
        subtitle="Runde 1 von 3"
        icon={<Trophy size={20} weight="bold" />}
        actions={<Badge variant="info">Laufend</Badge>}
      />

      <MatchListPattern
        title="Spielplan Gruppe A"
        subtitle="4 Spiele offen"
        toolbar={
          <>
            <Button variant="secondary" size="sm">Nach Gruppe</Button>
            <Button variant="info" size="sm">Gesamt</Button>
          </>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-semibold">Spiel</th>
              <th className="px-3 py-2 text-left font-semibold">P1</th>
              <th className="px-3 py-2 text-left font-semibold">P2</th>
              <th className="px-3 py-2 text-center font-semibold">Resultat</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="px-3 py-2">1</td>
              <td className="px-3 py-2">Thomas Indergang</td>
              <td className="px-3 py-2">Roger Baumann</td>
              <td className="px-3 py-2 text-center">2 : 1</td>
            </tr>
          </tbody>
        </table>
      </MatchListPattern>
    </div>
  ),
};

export const StandingAndKOWrappers: Story = {
  render: () => (
    <div className="space-y-6">
      <StandingTablePattern
        title="Gruppentabelle A"
        tieBreakNote="Bei Punktgleichheit entscheidet Torverhältnis, danach direkte Begegnung."
        rows={[
          { rank: 1, name: 'Thomas Indergang', points: 9, diff: 7 },
          { rank: 2, name: 'Roger Baumann', points: 6, diff: 2 },
          { rank: 3, name: 'Erkan Cokicli', points: 3, diff: -3 },
        ]}
        columns={[
          { key: 'rank', label: '#', render: (row) => row.rank },
          { key: 'name', label: 'Teilnehmer', render: (row) => row.name },
          { key: 'points', label: 'Punkte', align: 'right', render: (row) => row.points },
          { key: 'diff', label: 'Diff', align: 'right', render: (row) => row.diff },
        ]}
      />

      <KOBracketPattern
        matches={koMatches}
        participants={participants}
        tournamentId={1}
        drawMode={null}
        koDistribution={null}
        mode="management"
      />

      <KOBracketPattern
        matches={koMatches}
        participants={participants}
        tournamentId={1}
        drawMode={null}
        koDistribution={null}
        mode="presentation"
      />
    </div>
  ),
};
