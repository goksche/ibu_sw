// Admin User Management Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Input, Button, Select } from '../../components/ui';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { Plus, Pencil, Trash, Users, ArrowLeft } from 'phosphor-react';

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

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Zugriff verweigert</h2>
        <p>Sie haben keine Berechtigung für diese Seite.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem'
            }}
          >
            <ArrowLeft size={16} />
            Zurück
          </Button>

          <div>
            <h1 style={{
              margin: 0,
              color: '#1a1a1a',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Users size={32} />
              Benutzer-Verwaltung
            </h1>
            <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
              Verwalten Sie Benutzer und deren Rollen
              <br />
              <small style={{ color: '#888' }}>Änderungen werden in der Datenbank gespeichert</small>
            </p>
          </div>
        </div>

        <Button
          onClick={startCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={16} />
          Neuer Benutzer
        </Button>
      </div>

      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#ffebee',
          color: '#d32f2f',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: '2rem' }}>
          <h3>{editingUser ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h3>

          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
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

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '0.85rem', color: '#888' }}>
                  Benutzername wird automatisch aus der E-Mail erzeugt.
                  <br />
                  Login erfolgt per OTP (E-Mail).
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
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
        <h3>Benutzer-Liste</h3>

        {loading ? (
          <p>Lade Benutzer...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: '1rem'
            }}>
              <thead>
                <tr style={{
                  borderBottom: `1px solid #e0e0e0`,
                  textAlign: 'left'
                }}>
                  <th style={{ padding: '1rem' }}>Benutzername</th>
                  <th style={{ padding: '1rem' }}>E-Mail</th>
                  <th style={{ padding: '1rem' }}>Rolle</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Erstellt</th>
                  <th style={{ padding: '1rem' }}>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{
                    borderBottom: `1px solid #f0f0f0`
                  }}>
                    <td style={{ padding: '1rem' }}>{user.username}</td>
                    <td style={{ padding: '1rem' }}>{user.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        backgroundColor: user.role === UserRole.ADMIN
                          ? '#e3f2fd'
                          : user.role === UserRole.USER
                          ? '#e8f5e8'
                          : '#e3f2fd',
                        color: user.role === UserRole.ADMIN
                          ? '#1976d2'
                          : user.role === UserRole.USER
                          ? '#388e3c'
                          : '#1976d2'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        color: user.is_active ? '#388e3c' : '#d32f2f'
                      }}>
                        {user.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {new Date(user.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Button
                          variant="secondary"
                          onClick={() => handleEdit(user)}
                          style={{ padding: '0.25rem' }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => handleDelete(user)}
                          style={{ padding: '0.25rem' }}
                          disabled={user.username === 'goksche' || user.role === 'admin'} // Don't allow deleting admin users
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