// Admin User Management Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Input, Button, Select, Badge } from '../../components/ui';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { Plus, Pencil, Trash, Users, ArrowLeft } from 'phosphor-react';
import { cn } from '@/lib/utils';

// UserRole enum for the component
enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer'
}

interface UserFormData {
  email: string;
  role: UserRole;
}

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    role: 'user' as UserRole
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('Loading users from API...');

      // Load users from API
      const usersData = await authService.getUsers();
      console.log('Loaded users from API:', usersData.length);

      setUsers(usersData);
      setError('');
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.response?.data?.detail || 'Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingUser) {
        // Update user via API
        await authService.updateUser(editingUser.id, {
          email: formData.email,
          role: formData.role
        });
        console.log('User updated:', editingUser.id, formData);
      } else {
        // Create user via API
        await authService.createUser({
          email: formData.email,
          role: formData.role
        });
        console.log('User created:', formData.email);
      }

      // Reload users from API
      await loadUsers();

      // Reset form
      setShowForm(false);
      setEditingUser(null);
      resetForm();
    } catch (err: any) {
      console.error('User operation failed:', err);
      setError(err.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      role: user.role as UserRole
    });
    setShowForm(true);
  };

  const handleDelete = async (user: User) => {
    // Prevent deletion of the main admin user
    if (user.username === 'goksche' || user.role === 'admin') {
      alert('Der Administrator-Benutzer kann nicht gelöscht werden.');
      return;
    }

    if (!confirm(`Benutzer "${user.username}" wirklich löschen?`)) {
      return;
    }

    try {
      // Delete user via API
      await authService.deleteUser(user.id);
      console.log('User deleted:', user.id);

      // Reload users from API
      await loadUsers();
    } catch (err: any) {
      console.error('Delete failed:', err);
      setError(err.response?.data?.detail || 'Fehler beim Löschen');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      role: 'user' as UserRole
    });
  };

  const startCreate = () => {
    setEditingUser(null);
    resetForm();
    setShowForm(true);
  };

  const getRoleBadgeVariant = (role: string): 'info' | 'success' | 'secondary' => {
    if (role === UserRole.ADMIN) return 'info';
    if (role === UserRole.USER) return 'success';
    return 'secondary';
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-foreground">Zugriff verweigert</h2>
        <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Seite.</p>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen text-foreground">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 py-2 px-4"
          >
            <ArrowLeft size={16} />
            Zurück
          </Button>

          <div>
            <h1 className="m-0 text-foreground flex items-center gap-4">
              <Users size={32} />
              Benutzer-Verwaltung
            </h1>
            <p className="text-muted-foreground mt-2 mb-0">
              Verwalten Sie Benutzer und deren Rollen
              <br />
              <small className="text-muted-foreground">Änderungen werden in der Datenbank gespeichert</small>
            </p>
          </div>
        </div>

        <Button
          onClick={startCreate}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Neuer Benutzer
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-8">
          <h3 className="text-foreground">{editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h3>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-4">
              <div>
                <Input
                  label="E-Mail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Select
                  label="Rolle"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  options={[
                    { value: UserRole.ADMIN, label: 'Admin' },
                    { value: UserRole.USER, label: 'User' },
                    { value: UserRole.VIEWER, label: 'Viewer' }
                  ]}
                  required
                />
              </div>

              <div className="col-span-full">
                <div className="text-sm text-muted-foreground">
                  Benutzername wird automatisch aus der E-Mail erzeugt.
                  <br />
                  Login erfolgt per OTP (E-Mail).
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? 'Speichern...' : (editingUser ? 'Aktualisieren' : 'Erstellen')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                }}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="text-foreground">Benutzer-Liste</h3>

        {loading ? (
          <p className="text-muted-foreground">Lade Benutzer...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mt-4">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-4">Benutzername</th>
                  <th className="p-4">E-Mail</th>
                  <th className="p-4">Rolle</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Erstellt</th>
                  <th className="p-4">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border">
                    <td className="p-4">{user.username}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">
                      <Badge variant={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        user.is_active ? 'text-success' : 'text-destructive'
                      )}>
                        {user.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="p-4">
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(user)}
                          className="p-1"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDelete(user)}
                          className="p-1"
                          disabled={user.username === 'goksche' || user.role === 'admin'}
                        >
                          <Trash size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
