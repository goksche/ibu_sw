import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '@/components/ui';
import PageHeader from '@/components/patterns/management/PageHeader';
import DataTablePattern from '@/components/patterns/management/DataTablePattern';
import '@/styles/arena-theme.css';

function ArenaManagementPreview() {
  return (
    <div className="fs-arena-root">
      <div className="fs-arena-content p-8 space-y-6">
        <PageHeader
          title="Management UI - Arena"
          subtitle="Admin, Settings, Logs in Premium Dark Surface"
          actions={
            <>
              <Button variant="secondary">Export</Button>
              <Button variant="primary">Neuer Eintrag</Button>
            </>
          }
        />

        <div className="fs-surface-elevated p-4">
          <DataTablePattern title="Benutzerübersicht">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left font-semibold">Name</th>
                  <th className="px-3 py-2 text-left font-semibold">Rolle</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/70">
                  <td className="px-3 py-2">Lara Meyer</td>
                  <td className="px-3 py-2">Power Admin</td>
                  <td className="px-3 py-2">Aktiv</td>
                </tr>
                <tr className="border-b border-border/70">
                  <td className="px-3 py-2">Thomas Indergang</td>
                  <td className="px-3 py-2">Admin</td>
                  <td className="px-3 py-2">Aktiv</td>
                </tr>
              </tbody>
            </table>
          </DataTablePattern>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof ArenaManagementPreview> = {
  title: 'Patterns/Management/Arena/Preview',
  component: ArenaManagementPreview,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
