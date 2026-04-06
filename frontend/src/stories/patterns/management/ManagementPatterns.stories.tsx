import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, Input } from '@/components/ui';
import PageHeader from '@/components/patterns/management/PageHeader';
import DataTablePattern from '@/components/patterns/management/DataTablePattern';
import SettingsSectionPattern from '@/components/patterns/management/SettingsSectionPattern';
import AdminLogListPattern from '@/components/patterns/management/AdminLogListPattern';

const meta: Meta = {
  title: 'Patterns/Management/Library',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const PageHeaderStateMatrix: Story = {
  render: () => (
    <div className="space-y-6">
      <PageHeader title="Turnierverwaltung" subtitle="Status und Aktionen im einheitlichen Seitenkopf" />
      <PageHeader
        title="Benutzerverwaltung"
        breadcrumbs="Admin / Benutzer"
        actions={
          <>
            <Button variant="secondary">Export</Button>
            <Button variant="primary">Neu</Button>
          </>
        }
      />
    </div>
  ),
};

export const DataTableStateMatrix: Story = {
  render: () => (
    <div className="space-y-6">
      <DataTablePattern
        title="Benutzer"
        filters={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input label="Suche" placeholder="Name oder E-Mail" />
            <Input label="Rolle" placeholder="admin" />
            <Input label="Status" placeholder="aktiv" />
          </div>
        }
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-semibold">Name</th>
              <th className="px-3 py-2 text-left font-semibold">Rolle</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60">
              <td className="px-3 py-2">Lara Meyer</td>
              <td className="px-3 py-2">Admin</td>
              <td className="px-3 py-2">Aktiv</td>
            </tr>
          </tbody>
        </table>
      </DataTablePattern>

      <DataTablePattern title="Benutzer" loading>
        <div />
      </DataTablePattern>

      <DataTablePattern title="Benutzer" isEmpty emptyText="Keine Benutzer vorhanden.">
        <div />
      </DataTablePattern>
    </div>
  ),
};

export const SettingsAndLogsPatterns: Story = {
  render: () => (
    <div className="space-y-6">
      <SettingsSectionPattern
        title="LiveTicker"
        description="Konfiguration für die Präsentationsansicht"
        footer={<Button variant="primary">Speichern</Button>}
      >
        <Input label="Slide-Dauer (Sek.)" type="number" defaultValue={10} />
        <Input label="Refresh (Sek.)" type="number" defaultValue={30} />
      </SettingsSectionPattern>

      <AdminLogListPattern
        title="System-Logs"
        entries={[
          {
            id: 1,
            timestamp: '2026-01-25 10:32',
            actor: 'goksche23@gmail.com',
            action: 'ROLE_CHANGE',
            scope: 'User: admin01',
            severity: 'warning',
          },
          {
            id: 2,
            timestamp: '2026-01-25 10:35',
            actor: 'system',
            action: 'OTP_SENT',
            scope: 'User: lara@example.com',
            severity: 'info',
          },
        ]}
      />
    </div>
  ),
};
