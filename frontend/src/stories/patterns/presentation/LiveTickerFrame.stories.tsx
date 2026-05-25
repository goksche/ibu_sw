import type { Meta, StoryObj } from '@storybook/react-vite';

function LiveTickerFrame() {
  return (
    <div className="p-8 bg-background text-foreground min-h-[60vh]">
      <h2 className="text-3xl font-bold">Live-Ticker</h2>
      <p className="text-muted-foreground mt-2">Präsentationsrahmen für Folien und Match-Infos.</p>
      <div className="mt-6 border border-border rounded-lg p-6 bg-card">
        <div className="text-xl font-semibold">IBU Vereinsturnier</div>
        <div className="mt-2 text-muted-foreground">Nächste Folie in 10 Sekunden</div>
      </div>
    </div>
  );
}

const meta: Meta<typeof LiveTickerFrame> = {
  title: 'Patterns/Presentation/States/Frame',
  component: LiveTickerFrame,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
