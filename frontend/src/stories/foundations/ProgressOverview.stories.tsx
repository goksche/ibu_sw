import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Card, CardContent } from '@/components/ui';

function ProgressOverview() {
  return (
    <div className="p-6 space-y-4 bg-background text-foreground min-h-screen">
      <div>
        <h2 className="m-0 text-2xl font-semibold">UI/Design System Fortschritt</h2>
        <p className="mt-1 mb-0 text-sm text-muted-foreground">
          Zentrale Übersicht für Governance, Arena-Rollout und Multi-Theme-Ausbau.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <h3 className="m-0 text-base">Arena Design Freeze (Storybook-first)</h3>
            <Badge variant="success">Abgeschlossen</Badge>
          </div>
          <p className="mt-2 mb-0 text-sm text-muted-foreground">
            Arena Preview + Layer-Previews für Management/Tournament/Presentation sind als visuelle Referenz verfügbar.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-base">Management UI</h3>
              <Badge variant="success">Abgeschlossen</Badge>
            </div>
            <ul className="m-0 pl-5 text-sm text-muted-foreground space-y-1">
              <li>PageHeader / DataTable / SettingsSection / AdminLogList</li>
              <li>State-Matrix für User, Logs, Settings</li>
              <li>Dashboard auf Pattern-Komposition umgestellt</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-base">Tournament UI</h3>
              <Badge variant="success">Abgeschlossen</Badge>
            </div>
            <ul className="m-0 pl-5 text-sm text-muted-foreground space-y-1">
              <li>TournamentSectionHeader / MatchList / StandingTable / KO Wrapper</li>
              <li>Pattern-Library + State-Stories vereinheitlicht</li>
              <li>TournamentDetail und LeagueDetail konsistent refactored</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-base">Presentation UI</h3>
              <Badge variant="success">Abgeschlossen</Badge>
            </div>
            <ul className="m-0 pl-5 text-sm text-muted-foreground space-y-1">
              <li>LiveTicker SlideShell + Title/Groups/Qualification/KO</li>
              <li>Lesbarkeit für Distanzansicht (Typo/Spacing) standardisiert</li>
              <li>LiveTicker auf Slide-Patterns umgestellt</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">Governance</Badge>
            <Badge variant="info">Token-First</Badge>
            <Badge variant="info">No Inline Styles</Badge>
            <Badge variant="info">Pattern Naming konsistent</Badge>
            <Badge variant="success">storybook:test grün</Badge>
            <Badge variant="success">build grün</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const meta: Meta<typeof ProgressOverview> = {
  title: 'Foundations/Progress/ImplementationStatus',
  component: ProgressOverview,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
