import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge, Button, Card, Input, Select } from '@/components/ui';

type ViewState = 'success' | 'loading' | 'empty' | 'error' | 'permission';

type UserRow = {
  id: number;
  username: string;
  email: string;
  role: 'power_admin' | 'admin' | 'user' | 'viewer';
  active: boolean;
  createdAt: string;
};

const users: UserRow[] = [
  { id: 1, username: 'goksche', email: 'goksche23@gmail.com', role: 'power_admin', active: true, createdAt: '20.02.2026' },
  { id: 2, username: 'admin_ibu', email: 'admin@finalstage.ch', role: 'admin', active: true, createdAt: '21.02.2026' },
  { id: 3, username: 'roman', email: 'roman@finalstage.ch', role: 'user', active: true, createdAt: '22.02.2026' },
  { id: 4, username: 'viewer_demo', email: 'viewer@finalstage.ch', role: 'viewer', active: false, createdAt: '22.02.2026' },
];

function roleVariant(role: UserRow['role']) {
  if (role === 'power_admin') return 'destructive';
  if (role === 'admin') return 'info';
  if (role === 'user') return 'success';
  return 'secondary';
}

function UserManagementPattern({ state }: { state: ViewState }) {
  if (state === 'permission') {
    return (
      <div className="p-8 text-center">
        <h3 className="text-foreground mb-2">Zugriff verweigert</h3>
        <p className="text-muted-foreground m-0">Nur Admins können Benutzer verwalten.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="m-0">Benutzerverwaltung</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-0">Rollen, Status und Aktionen zentral steuern.</p>
        </div>
        <Button>Neuer Benutzer</Button>
      </div>

      {state === 'error' && (
        <div className="mb-4 p-3 rounded border border-destructive bg-destructive/10 text-destructive text-sm">
          Benutzer konnten nicht geladen werden. Bitte erneut versuchen.
        </div>
      )}

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-3 gap-4">
          <Input label="E-Mail" placeholder="name@domain.ch" />
          <Select
            label="Rolle"
            options={[
              { value: 'all', label: 'Alle Rollen' },
              { value: 'admin', label: 'Admin' },
              { value: 'user', label: 'User' },
            ]}
            defaultValue="all"
          />
          <div className="flex items-end justify-end">
            <Button variant="secondary">Aktualisieren</Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {state === 'loading' && <div className="p-4 text-muted-foreground">Benutzer werden geladen...</div>}
        {state === 'empty' && <div className="p-4 text-muted-foreground">Keine Benutzer gefunden.</div>}
        {state === 'success' && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="p-3">Username</th>
                <th className="p-3">E-Mail</th>
                <th className="p-3">Rolle</th>
                <th className="p-3">Status</th>
                <th className="p-3">Erstellt</th>
                <th className="p-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/60">
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <Badge variant={roleVariant(user.role)}>{user.role}</Badge>
                  </td>
                  <td className="p-3">
                    <span className={user.active ? 'text-success' : 'text-destructive'}>{user.active ? 'aktiv' : 'inaktiv'}</span>
                  </td>
                  <td className="p-3">{user.createdAt}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm">Bearbeiten</Button>
                      <Button variant="danger" size="sm" disabled={user.role === 'power_admin' || user.role === 'admin'}>
                        Löschen
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

const meta: Meta<typeof UserManagementPattern> = {
  title: 'Patterns/Management/States/UserManagement',
  component: UserManagementPattern,
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { state: 'success' } };
export const Loading: Story = { args: { state: 'loading' } };
export const Empty: Story = { args: { state: 'empty' } };
export const Error: Story = { args: { state: 'error' } };
export const PermissionDenied: Story = { args: { state: 'permission' } };
