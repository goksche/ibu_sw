import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Card, CardContent } from '@/components/ui';

function TournamentOverviewStates() {
  return (
    <div className="p-6 grid gap-3">
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <span>Gruppenphase</span>
          <Badge variant="info">Laufend</Badge>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 flex items-center justify-between">
          <span>KO-Phase</span>
          <Badge variant="success">Bereit</Badge>
        </CardContent>
      </Card>
    </div>
  );
}

const meta: Meta<typeof TournamentOverviewStates> = {
  title: 'Patterns/Tournament/States/Overview',
  component: TournamentOverviewStates,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
