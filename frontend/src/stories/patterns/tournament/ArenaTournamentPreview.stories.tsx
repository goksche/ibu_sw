import type { Meta, StoryObj } from '@storybook/react-vite';
import StandingTablePattern from '@/components/patterns/tournament/StandingTablePattern';
import MatchListPattern from '@/components/patterns/tournament/MatchListPattern';
import '@/styles/arena-theme.css';

function ArenaTournamentPreview() {
  return (
    <div className="fs-arena-root">
      <div className="fs-arena-content p-8 space-y-6">
        <div className="fs-surface-hero p-6">
          <h2 className="m-0 text-3xl font-bold">Tournament UI - Arena</h2>
          <p className="mt-2 mb-0 fs-text-2">Gruppen, Spielplan und Tabellen mit niedriger visueller Lautstärke.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="fs-surface-elevated p-4">
            <MatchListPattern title="Spielplan Gruppe A" subtitle="3 offene Spiele">
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
                  <tr className="border-b border-border/70">
                    <td className="px-3 py-2">1</td>
                    <td className="px-3 py-2">Team Alpha</td>
                    <td className="px-3 py-2">Team Bravo</td>
                    <td className="px-3 py-2 text-center">2 : 1</td>
                  </tr>
                </tbody>
              </table>
            </MatchListPattern>
          </div>

          <div className="fs-surface-elevated p-4">
            <StandingTablePattern
              title="Tabelle Gruppe A"
              rows={[
                { rank: 1, name: 'Team Alpha', pts: 9, diff: 7 },
                { rank: 2, name: 'Team Bravo', pts: 6, diff: 2 },
                { rank: 3, name: 'Team Cobra', pts: 3, diff: -3 },
              ]}
              columns={[
                { key: 'rank', label: '#', render: (row) => row.rank },
                { key: 'name', label: 'Team', render: (row) => row.name },
                { key: 'pts', label: 'Punkte', align: 'right', render: (row) => row.pts },
                { key: 'diff', label: 'Diff', align: 'right', render: (row) => row.diff },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ArenaTournamentPreview> = {
  title: 'Patterns/Tournament/Arena/Preview',
  component: ArenaTournamentPreview,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
