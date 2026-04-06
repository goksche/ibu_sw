import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';

type ViewState = 'success' | 'error' | 'power_admin' | 'saving';

function SettingsPattern({ state }: { state: ViewState }) {
  const showGlobal = state === 'power_admin' || state === 'saving';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h3 className="m-0 mb-4">Einstellungen</h3>

      {state === 'error' && (
        <div className="mb-3 text-sm text-destructive">Einstellungen konnten nicht geladen werden.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader>
            <CardTitle className="mt-0">Meine Anzeige</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              label="Layout"
              defaultValue="standard"
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'neon', label: 'NeonGreen' },
                { value: 'neon_cyan', label: 'NeonCyan' },
              ]}
            />
            <Select
              label="Schriftart"
              defaultValue="Inter"
              options={[
                { value: 'Inter', label: 'Inter' },
                { value: 'Source Sans 3', label: 'Source Sans 3' },
                { value: 'Baskervville', label: 'Baskervville' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="mt-0">Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              label="Standard-Sortierung"
              defaultValue="date"
              options={[
                { value: 'date', label: 'Datum' },
                { value: 'name', label: 'Name' },
                { value: 'status', label: 'Status' },
              ]}
            />
            <Input label="Sprache" defaultValue="de" disabled />
            <Input label="Timezone" defaultValue="Europe/Zurich" disabled />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mb-6">
        <Button disabled={state === 'saving'}>{state === 'saving' ? 'Speichern...' : 'Meine Einstellungen speichern'}</Button>
      </div>

      {showGlobal && (
        <Card>
          <CardHeader>
            <CardTitle className="mt-0">Globale Defaults (Power Admin)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Slide-Dauer (Sek.)" type="number" defaultValue={10} />
            <Input label="Refresh (Sek.)" type="number" defaultValue={30} />
            <Select
              label="Gruppen pro Folie"
              defaultValue={1}
              options={[
                { value: 1, label: '1 Gruppe' },
                { value: 2, label: '2 Gruppen' },
              ]}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const meta: Meta<typeof SettingsPattern> = {
  title: 'Patterns/Management/States/Settings',
  component: SettingsPattern,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { state: 'success' } };
export const Error: Story = { args: { state: 'error' } };
export const PowerAdmin: Story = { args: { state: 'power_admin' } };
export const Saving: Story = { args: { state: 'saving' } };
