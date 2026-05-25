import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';

function LeagueWizardPattern({ step }: { step: number }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="rounded-lg border border-border bg-card/60 p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Geführter Assistent: Schritt {step} von 7</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked />
          Geführter Assistent
        </label>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${(step / 7) * 100}%` }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="mt-0">Meisterschaft Wizard - Schritt {step}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step === 1 && (
            <>
              <Input label="Name" defaultValue="Vereinsmeisterschaft 2026" />
              <Select label="Zeitraum" defaultValue="year" options={[{ value: 'year', label: 'Jahr' }, { value: 'season', label: 'Saison' }]} />
            </>
          )}
          {step === 4 && <div className="text-sm text-muted-foreground">Punkteverteilung inkl. Top-Platzierungen und KO-Runden konfigurierbar.</div>}
          {step === 7 && <div className="text-sm text-muted-foreground">Zusammenfassung vor dem finalen Erstellen.</div>}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary">Zurück</Button>
        <Button variant="primary">Weiter</Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof LeagueWizardPattern> = {
  title: 'Patterns/Management/States/CreateLeagueWizard',
  component: LeagueWizardPattern,
};

export default meta;
type Story = StoryObj<typeof LeagueWizardPattern>;

export const Step1: Story = { args: { step: 1 } };
export const Step4: Story = { args: { step: 4 } };
export const Step7: Story = { args: { step: 7 } };
