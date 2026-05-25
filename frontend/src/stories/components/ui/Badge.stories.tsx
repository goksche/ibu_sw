import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '@/components/ui';

function BadgeShowcase() {
  return (
    <div className="p-6 flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Aktiv</Badge>
      <Badge variant="warning">Achtung</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="error">Fehler</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}

const meta: Meta<typeof BadgeShowcase> = {
  title: 'Components/UI/Badge',
  component: BadgeShowcase,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {};
