import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Button, Card } from '@/components/ui';

type ViewState = 'group_success' | 'group_loading' | 'ko_success' | 'ko_pending';

const groupMatches = [
  { id: 1, round: 1, no: 1, p1: 'Thomas Indergand', p2: 'Luca Gisler', score: '3 : 1', done: true },
  { id: 2, round: 1, no: 2, p1: 'Roger Baumann', p2: 'Erkan Cokicli', score: '2 : 3', done: true },
  { id: 3, round: 2, no: 1, p1: 'Thomas Indergand', p2: 'Erkan Cokicli', score: '- : -', done: false },
];

const koMatches = [
  { id: 11, round: 1, no: 1, p1: 'Thomas Indergand', p2: 'Livio Zberg', score: '3 : 1', ready: true },
  { id: 12, round: 1, no: 2, p1: 'Roger Baumann', p2: 'Scott Gamma', score: '3 : 0', ready: true },
  { id: 13, round: 2, no: 1, p1: 'Sieger Spiel 1', p2: 'Sieger Spiel 2', score: '- : -', ready: false },
];

function MatchScheduleStates({ state }: { state: ViewState }) {
  const isKo = state === 'ko_success' || state === 'ko_pending';
  const rows = isKo ? koMatches : groupMatches;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="m-0">{isKo ? 'KO-Spielplan' : 'Gruppen-Spielplan'}</h3>
        <div className="flex gap-2">
          <Button variant={isKo ? 'secondary' : 'info'} size="sm">Gruppen</Button>
          <Button variant={isKo ? 'danger' : 'secondary'} size="sm">KO</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {(state === 'group_loading') && <div className="p-4 text-muted-foreground">Spielplan wird geladen...</div>}
        {(state !== 'group_loading') && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left">Runde</th>
                <th className="p-3 text-left">Spiel</th>
                <th className="p-3 text-left">Player 1</th>
                <th className="p-3 text-left">Player 2</th>
                <th className="p-3 text-center">Resultat</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, idx) => (
                <tr key={m.id} className={idx % 2 === 0 ? 'bg-card border-b border-border/60' : 'bg-muted border-b border-border/60'}>
                  <td className="p-3">Runde {m.round}</td>
                  <td className="p-3">Spiel {m.no}</td>
                  <td className="p-3">{m.p1}</td>
                  <td className="p-3">{m.p2}</td>
                  <td className="p-3 text-center font-semibold">{m.score}</td>
                  <td className="p-3 text-center">
                    {'ready' in m && !m.ready
                      ? <Badge variant="warning">Warten</Badge>
                      : ('done' in m && m.done === false)
                        ? <Badge variant="warning">Offen</Badge>
                        : <Badge variant="success">Fertig</Badge>}
                  </td>
                  <td className="p-3 text-center">
                    <Button variant="info" size="sm" disabled={'ready' in m ? !m.ready : false}>
                      Ergebnis
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {state === 'ko_pending' && (
        <div className="mt-4 text-sm text-warning">
          Hinweis: Einige KO-Spiele sind noch nicht ausspielbar, bis Vorgängerrunden abgeschlossen sind.
        </div>
      )}
    </div>
  );
}

const meta: Meta<typeof MatchScheduleStates> = {
  title: 'Patterns/Tournament/States/MatchSchedule',
  component: MatchScheduleStates,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const GroupSuccess: Story = { args: { state: 'group_success' } };
export const GroupLoading: Story = { args: { state: 'group_loading' } };
export const KOSuccess: Story = { args: { state: 'ko_success' } };
export const KOPending: Story = { args: { state: 'ko_pending' } };
