import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

function ExampleCard() {
  return (
    <div className="max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Turnier Übersicht</CardTitle>
          <CardDescription>Nächster Spieltag heute um 19:30</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            24 Teilnehmende, 6 Gruppen, KO-Phase ab Viertelfinale.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const meta: Meta<typeof ExampleCard> = {
  title: 'Components/UI/Card',
  component: ExampleCard,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
