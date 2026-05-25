import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Card } from '@/components/ui';

type ViewState = 'calm' | 'busy' | 'no_data' | 'network_loss' | 'fullscreen';

const calmEvents = [
  { time: '18:42:01', text: 'Spiel 12 gestartet: Gruppe A' },
  { time: '18:43:10', text: 'Zwischenstand: 1 : 0' },
  { time: '18:44:35', text: 'Spiel 12 beendet: 3 : 1' },
];

const busyEvents = [
  { time: '19:10:02', text: 'Spiel 21 gestartet: Viertelfinale 1' },
  { time: '19:10:18', text: 'Spiel 22 gestartet: Viertelfinale 2' },
  { time: '19:11:01', text: 'Tor: Thomas Indergand (1:0)' },
  { time: '19:11:14', text: 'Tor: Roger Baumann (1:1)' },
  { time: '19:12:45', text: 'Spiel 21 beendet: 3 : 2' },
  { time: '19:13:03', text: 'Spiel 22 beendet: 2 : 0' },
  { time: '19:13:16', text: 'Nächste Folie: KO-Bracket' },
];

function LiveTickerStates({ state }: { state: ViewState }) {
  const fullscreen = state === 'fullscreen';
  const events = state === 'busy' ? busyEvents : calmEvents;

  return (
    <div className={fullscreen ? 'p-0 bg-background text-foreground min-h-screen' : 'p-6 bg-background text-foreground'}>
      <div className={fullscreen ? 'max-w-none' : 'max-w-5xl mx-auto'}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={fullscreen ? 'text-4xl m-0' : 'm-0'}>Live-Ticker</h3>
            <p className="text-muted-foreground mt-1 mb-0">
              {state === 'busy' ? 'High activity stream' : 'Präsentationsansicht'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={state === 'network_loss' ? 'error' : 'success'}>
              {state === 'network_loss' ? 'Offline' : 'Live'}
            </Badge>
            <Badge variant="info">{fullscreen ? 'Fullscreen' : 'Standard'}</Badge>
          </div>
        </div>

        {state === 'network_loss' && (
          <Card className="p-4 mb-4 border-destructive">
            <div className="text-destructive font-semibold">Verbindung unterbrochen</div>
            <div className="text-sm text-muted-foreground mt-1">
              Daten werden neu geladen, sobald die Verbindung wieder verfügbar ist.
            </div>
          </Card>
        )}

        {state === 'no_data' ? (
          <Card className="p-8 text-center">
            <div className="text-lg font-semibold">Keine Live-Daten verfügbar</div>
            <div className="text-muted-foreground mt-2">
              Noch keine laufenden Matches oder Ergebnisse vorhanden.
            </div>
          </Card>
        ) : (
          <Card className={fullscreen ? 'p-6' : 'p-4'}>
            <div className={fullscreen ? 'text-xl font-semibold mb-3' : 'font-semibold mb-3'}>
              Ereignis-Stream
            </div>
            <div className="flex flex-col gap-2">
              {events.map((event, idx) => (
                <div
                  key={`${event.time}-${idx}`}
                  className="flex items-start gap-3 p-2 rounded border border-border bg-muted/40"
                >
                  <div className="font-mono text-xs text-muted-foreground min-w-[72px]">{event.time}</div>
                  <div className={fullscreen ? 'text-lg' : 'text-sm'}>{event.text}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Auto-Refresh: 30s</span>
          <span>Slide 2/5</span>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof LiveTickerStates> = {
  title: 'Patterns/Presentation/States/LiveTicker',
  component: LiveTickerStates,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { state: 'calm' } };
export const Busy: Story = { args: { state: 'busy' } };
export const Empty: Story = { args: { state: 'no_data' } };
export const Error: Story = { args: { state: 'network_loss' } };
export const Fullscreen: Story = { args: { state: 'fullscreen' } };
