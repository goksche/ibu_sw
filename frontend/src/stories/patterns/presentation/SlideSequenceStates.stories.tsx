import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Card } from '@/components/ui';

type SlideType = 'title' | 'groups' | 'qualification' | 'ko';

function SlideSequenceStates({ slide }: { slide: SlideType }) {
  return (
    <div className="p-6 bg-background text-foreground min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="m-0">Live-Ticker Slide Sequenz</h3>
          <Badge variant="info">Aktive Folie: {slide}</Badge>
        </div>

        {slide === 'title' && (
          <Card className="p-12 text-center">
            <div className="text-4xl font-bold">1. Vereinsturnier IBU</div>
            <div className="text-muted-foreground mt-3 text-lg">Live Präsentation</div>
          </Card>
        )}

        {slide === 'groups' && (
          <Card className="p-4">
            <div className="font-semibold mb-3">Gruppenübersicht</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border p-3">
                <div className="font-medium mb-1">Gruppe A</div>
                <div className="text-sm text-muted-foreground">4 Spiele, 3 Ergebnisse</div>
              </div>
              <div className="rounded border border-border p-3">
                <div className="font-medium mb-1">Gruppe B</div>
                <div className="text-sm text-muted-foreground">4 Spiele, 4 Ergebnisse</div>
              </div>
            </div>
          </Card>
        )}

        {slide === 'qualification' && (
          <Card className="p-4">
            <div className="font-semibold mb-3">Qualifikation</div>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-2 text-left">Rang</th>
                  <th className="p-2 text-left">Spieler</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="p-2">1</td>
                  <td className="p-2">Thomas Indergand</td>
                  <td className="p-2"><Badge variant="success">Qualifiziert</Badge></td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="p-2">2</td>
                  <td className="p-2">Roger Baumann</td>
                  <td className="p-2"><Badge variant="success">Qualifiziert</Badge></td>
                </tr>
                <tr>
                  <td className="p-2">3</td>
                  <td className="p-2">Erkan Cokicli</td>
                  <td className="p-2"><Badge variant="warning">Tie-Break</Badge></td>
                </tr>
              </tbody>
            </table>
          </Card>
        )}

        {slide === 'ko' && (
          <Card className="p-4">
            <div className="font-semibold mb-3">KO-Phase</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded border border-border p-3">
                <div className="text-sm text-muted-foreground">Halbfinale</div>
                <div className="mt-1">Thomas 3 : 2 Roger</div>
              </div>
              <div className="rounded border border-border p-3">
                <div className="text-sm text-muted-foreground">Halbfinale</div>
                <div className="mt-1">Erkan 1 : 3 Luca</div>
              </div>
              <div className="rounded border border-primary p-3 bg-primary/10">
                <div className="text-sm text-muted-foreground">Finale</div>
                <div className="mt-1 font-semibold">Thomas vs Luca</div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof SlideSequenceStates> = {
  title: 'Patterns/Presentation/States/SlideSequence',
  component: SlideSequenceStates,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Title: Story = { args: { slide: 'title' } };
export const Groups: Story = { args: { slide: 'groups' } };
export const Qualification: Story = { args: { slide: 'qualification' } };
export const KO: Story = { args: { slide: 'ko' } };
