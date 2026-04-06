import type { Meta, StoryObj } from '@storybook/react-vite';

const tokens = [
  'bg-background',
  'bg-card',
  'bg-primary',
  'bg-secondary',
  'bg-muted',
  'bg-success',
  'bg-warning',
  'bg-info',
  'bg-destructive',
] as const;

function ColorSwatches() {
  return (
    <div className="p-6">
      <h3 className="mb-4">Farbtokens</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {tokens.map((token) => (
          <div key={token} className="border border-border rounded-md p-3">
            <div className={`h-16 rounded ${token}`} />
            <div className="mt-2 text-xs text-muted-foreground">{token}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const meta: Meta<typeof ColorSwatches> = {
  title: 'Foundations/Colors',
  component: ColorSwatches,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};
