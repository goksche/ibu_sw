import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';

type ViewState = 'success' | 'loading' | 'empty' | 'error' | 'permission';

const rows = [
  { id: 1, time: '24.02.2026, 18:42:01', path: '/leagues/4', user: '40', ip: '95.111.238.180' },
  { id: 2, time: '24.02.2026, 18:42:09', path: '/tournaments/21', user: '10', ip: '95.111.238.180' },
  { id: 3, time: '24.02.2026, 18:42:18', path: '/settings', user: '1', ip: '95.111.238.180' },
];

function LogsPattern({ state }: { state: ViewState }) {
  if (state === 'permission') {
    return (
      <div className="p-8 text-center">
        <h3 className="text-foreground mb-2">Zugriff verweigert</h3>
        <p className="text-muted-foreground m-0">Nur Admins können Logs einsehen.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h3 className="m-0 mb-4">Log Center</h3>

      <Tabs defaultValue="page_views">
        <TabsList className="mb-4 flex gap-2">
          <TabsTrigger value="page_views">Page Views</TabsTrigger>
          <TabsTrigger value="login_events">Login Events</TabsTrigger>
          <TabsTrigger value="api_requests">API Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="page_views">
          <Card className="p-4 mb-4">
            <div className="grid grid-cols-4 gap-3">
              <Input label="Suche" placeholder="/leagues/4" />
              <Input label="Von" type="date" />
              <Input label="Bis" type="date" />
              <div className="flex items-end justify-end">
                <Button variant="secondary">Aktualisieren</Button>
              </div>
            </div>
          </Card>

          {state === 'error' && (
            <div className="mb-3 text-sm text-destructive">Logs konnten nicht geladen werden.</div>
          )}

          <Card className="p-0 overflow-hidden">
            {state === 'loading' && <div className="p-4 text-muted-foreground">Lade Logs...</div>}
            {state === 'empty' && <div className="p-4 text-muted-foreground">Keine Einträge im gewählten Zeitraum.</div>}
            {state === 'success' && (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-3">Zeit</th>
                    <th className="p-3">Pfad</th>
                    <th className="p-3">User</th>
                    <th className="p-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="p-3">{r.time}</td>
                      <td className="p-3 font-mono text-sm">{r.path}</td>
                      <td className="p-3">{r.user}</td>
                      <td className="p-3">{r.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const meta: Meta<typeof LogsPattern> = {
  title: 'Patterns/Management/States/Logs',
  component: LogsPattern,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { state: 'success' } };
export const Loading: Story = { args: { state: 'loading' } };
export const Empty: Story = { args: { state: 'empty' } };
export const Error: Story = { args: { state: 'error' } };
export const PermissionDenied: Story = { args: { state: 'permission' } };
