import type { Meta, StoryObj } from '@storybook/react-vite';

const steps = [
  '1. Daten',
  '2. Spielorte',
  '3. Turnier-Modus',
  '4. Modus-Details',
  '5. Erstellen',
];

function WizardFlowPreview({ activeStep, modeLabel }: { activeStep: number; modeLabel: string }) {
  return (
    <div className="max-w-2xl rounded-lg border border-border bg-card p-5">
      <h3 className="mb-3 text-lg font-semibold text-foreground">Wizard-Reihenfolge</h3>
      <div className="mb-4 text-sm text-muted-foreground">
        Gewählter Modus: <span className="font-semibold text-foreground">{modeLabel}</span>
      </div>
      <div className="grid gap-2">
        {steps.map((label, idx) => {
          const stepNumber = idx + 1;
          const isActive = stepNumber === activeStep;
          const isDone = stepNumber < activeStep;
          return (
            <div
              key={label}
              className={`rounded border px-3 py-2 text-sm ${
                isActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : isDone
                    ? 'border-border bg-muted text-muted-foreground'
                    : 'border-border bg-background text-muted-foreground'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const meta: Meta<typeof WizardFlowPreview> = {
  title: 'Patterns/Tournament/States/WizardFlow',
  component: WizardFlowPreview,
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof WizardFlowPreview>;

export const LigaDetailsStep: Story = {
  args: {
    activeStep: 4,
    modeLabel: 'L4 Swiss System',
  },
};

export const KnockoutDetailsStep: Story = {
  args: {
    activeStep: 4,
    modeLabel: 'K2 Double Elimination',
  },
};

export const ReviewSubmitStep: Story = {
  args: {
    activeStep: 5,
    modeLabel: 'C3 Liga -> Page',
  },
};
