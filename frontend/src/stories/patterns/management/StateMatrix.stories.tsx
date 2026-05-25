import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent } from '@/components/ui';

function ManagementStateMatrix() {
  const states = ['Loading', 'Empty', 'Success', 'Error', 'PermissionDenied'];
  return (
    <div className="p-6 grid gap-3">
      {states.map((state) => (
        <Card key={state}>
          <CardContent className="pt-6">
            <div className="font-medium">{state}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Referenzzustand für Management-Ansichten.
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const meta: Meta<typeof ManagementStateMatrix> = {
  title: 'Patterns/Management/States/Matrix',
  component: ManagementStateMatrix,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
