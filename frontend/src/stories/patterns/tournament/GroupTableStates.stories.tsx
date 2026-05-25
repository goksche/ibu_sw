import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '@/components/ui';

type ViewState = 'success' | 'tie_case' | 'empty' | 'loading';

const baseRows = [
  { rank: 1, name: 'Thomas Indergand', games: 3, wins: 3, draws: 0, losses: 0, gf: 9, ga: 2, diff: 7, pts: 9 },
  { rank: 2, name: 'Roger Baumann', games: 3, wins: 2, draws: 0, losses: 1, gf: 7, ga: 4, diff: 3, pts: 6 },
  { rank: 3, name: 'Erkan Cokicli', games: 3, wins: 1, draws: 0, losses: 2, gf: 4, ga: 7, diff: -3, pts: 3 },
  { rank: 4, name: 'Luca Gisler', games: 3, wins: 0, draws: 0, losses: 3, gf: 2, ga: 9, diff: -7, pts: 0 },
];

function GroupTableStates({ state }: { state: ViewState }) {
  const rows = state === 'tie_case'
    ? [
        { rank: 1, name: 'Spieler A', games: 3, wins: 2, draws: 0, losses: 1, gf: 6, ga: 3, diff: 3, pts: 6, tie: true },
        { rank: 2, name: 'Spieler B', games: 3, wins: 2, draws: 0, losses: 1, gf: 5, ga: 2, diff: 3, pts: 6, tie: true },
        { rank: 3, name: 'Spieler C', games: 3, wins: 1, draws: 0, losses: 2, gf: 4, ga: 7, diff: -3, pts: 3, tie: false },
        { rank: 4, name: 'Spieler D', games: 3, wins: 1, draws: 0, losses: 2, gf: 3, ga: 6, diff: -3, pts: 3, tie: false },
      ]
    : baseRows.map((r) => ({ ...r, tie: false }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h3 className="m-0 mb-4">Gruppentabelle</h3>

      <Card className="p-0 overflow-hidden">
        {state === 'loading' && <div className="p-4 text-muted-foreground">Tabelle wird geladen...</div>}
        {state === 'empty' && <div className="p-4 text-muted-foreground">Noch keine Gruppen / keine Ergebnisse.</div>}

        {(state === 'success' || state === 'tie_case') && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-center">Rang</th>
                <th className="p-3 text-left">Spieler</th>
                <th className="p-3 text-center">Sp</th>
                <th className="p-3 text-center">S</th>
                <th className="p-3 text-center">U</th>
                <th className="p-3 text-center">N</th>
                <th className="p-3 text-center">+/-</th>
                <th className="p-3 text-center">Pkt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.name} className={idx % 2 === 0 ? 'bg-card border-b border-border/60' : 'bg-muted border-b border-border/60'}>
                  <td className="p-3 text-center font-bold">{row.rank}</td>
                  <td className="p-3">
                    {row.name}
                    {row.tie && <span className="ml-2 text-xs text-warning">(Tie)</span>}
                  </td>
                  <td className="p-3 text-center">{row.games}</td>
                  <td className="p-3 text-center">{row.wins}</td>
                  <td className="p-3 text-center">{row.draws}</td>
                  <td className="p-3 text-center">{row.losses}</td>
                  <td className={`p-3 text-center font-bold ${row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-destructive' : ''}`}>
                    {row.diff > 0 ? '+' : ''}
                    {row.diff}
                  </td>
                  <td className="p-3 text-center font-bold text-info">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {state === 'tie_case' && (
        <div className="mt-4 p-3 rounded border border-warning bg-warning/10 text-sm text-warning">
          Tie-Break nötig: Spieler A und B haben gleiche Punkte und gleiche Differenz.
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof GroupTableStates> = {
  title: 'Patterns/Tournament/States/GroupTable',
  component: GroupTableStates,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { state: 'success' } };
export const TieBreak: Story = { args: { state: 'tie_case' } };
export const Empty: Story = { args: { state: 'empty' } };
export const Loading: Story = { args: { state: 'loading' } };
