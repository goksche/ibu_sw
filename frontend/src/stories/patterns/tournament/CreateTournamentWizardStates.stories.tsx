import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select } from '@/components/ui';

function TournamentWizardPattern({ step }: { step: number }) {
  const totalSteps = 5;
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="rounded-lg border border-border bg-card/60 p-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Geführter Assistent: Schritt {step} von {totalSteps}</div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked />
          Geführter Assistent
        </label>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary rounded-full" style={{ width: `${(step / totalSteps) * 100}%` }} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="mt-0">Turnier Wizard - Schritt {step}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {step === 1 && (
            <>
              <Input label="Name" defaultValue="Vereinsturnier 2026" />
              <Input label="Startdatum" type="date" defaultValue="2026-01-31" />
            </>
          )}
          {step === 2 && (
            <Select
              label="Modus"
              defaultValue="combined"
              options={[
                { value: 'round_robin', label: 'Liga' },
                { value: 'knockout', label: 'KO' },
                { value: 'combined', label: 'Kombi' },
              ]}
            />
          )}
          {step >= 3 && <div className="text-sm text-muted-foreground">Komplexe Gruppen-/KO-Logik bleibt unverändert und wird nur schrittweise dargestellt.</div>}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary">Zurück</Button>
        <Button variant="primary">Weiter</Button>
      </div>
    </div>
  );
}

const meta: Meta<typeof TournamentWizardPattern> = {
  title: 'Patterns/Tournament/States/CreateTournamentWizard',
  component: TournamentWizardPattern,
};

export default meta;
type Story = StoryObj<typeof TournamentWizardPattern>;

export const Step1: Story = { args: { step: 1 } };
export const Step3: Story = { args: { step: 3 } };
export const Step5: Story = { args: { step: 5 } };
