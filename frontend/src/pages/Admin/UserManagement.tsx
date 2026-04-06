// Admin User Management Page
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Input, Button, Select, Badge } from '../../components/ui';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { Plus, Pencil, Trash, Users, ArrowLeft } from 'phosphor-react';
import { cn } from '@/lib/utils';

// UserRole enum for the component
enum UserRole {
  POWER_ADMIN = 'power_admin',
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
  const { t } = useTranslation();
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
      setError(err.response?.data?.detail || t('admin.users.loadError'));
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
      setError(err.response?.data?.detail || t('admin.users.saveError'));
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
    if (user.username === 'goksche' || user.role === 'power_admin' || user.role === 'admin') {
      alert(t('admin.users.adminDeleteProtected'));
      return;
    }

    if (!confirm(t('admin.users.deleteConfirm', { name: user.username }))) {
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
      setError(err.response?.data?.detail || t('admin.users.deleteError'));
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

  const getRoleBadgeVariant = (role: string): 'info' | 'success' | 'secondary' | 'destructive' => {
    if (role === UserRole.POWER_ADMIN) return 'destructive';
    if (role === UserRole.ADMIN) return 'info';
    if (role === UserRole.USER) return 'success';
    return 'secondary';
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-foreground">{t('admin.users.accessDenied')}</h2>
        <p className="text-muted-foreground">{t('admin.users.noPermission')}</p>
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
            {t('common.back')}
          </Button>

          <div>
            <h1 className="m-0 text-foreground flex items-center gap-4">
              <Users size={32} />
              {t('admin.users.title')}
            </h1>
            <p className="text-muted-foreground mt-2 mb-0">
              {t('admin.users.subtitle')}
              <br />
              <small className="text-muted-foreground">{t('admin.users.dbNote')}</small>
            </p>
          </div>
        </div>

        <Button
          onClick={startCreate}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          {t('admin.users.newUser')}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <Card className="mb-8">
          <h3 className="text-foreground">{editingUser ? t('admin.users.editUser') : t('admin.users.newUser')}</h3>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4 mb-4">
              <div>
                <Input
                  label={t('admin.users.emailLabel')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <Select
                  label={t('admin.users.roleLabel')}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  options={[
                    { value: UserRole.POWER_ADMIN, label: 'Power Admin' },
                    { value: UserRole.ADMIN, label: 'Admin' },
                    { value: UserRole.USER, label: 'User' },
                    { value: UserRole.VIEWER, label: 'Viewer' }
                  ]}
                  required
                />
              </div>

              <div className="col-span-full">
                <div className="text-sm text-muted-foreground">
                  {t('admin.users.autoUsername')}
                  <br />
                  {t('admin.users.otpLogin')}
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? t('common.savingShort') : (editingUser ? t('common.update') : t('common.create'))}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                }}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="text-foreground">{t('admin.users.userList')}</h3>

        {loading ? (
          <p className="text-muted-foreground">{t('admin.users.loadingUsers')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse mt-4">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-4">{t('admin.users.table.username')}</th>
                  <th className="p-4">{t('admin.users.table.email')}</th>
                  <th className="p-4">{t('admin.users.table.role')}</th>
                  <th className="p-4">{t('admin.users.table.status')}</th>
                  <th className="p-4">{t('admin.users.table.created')}</th>
                  <th className="p-4">{t('admin.users.table.actions')}</th>
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
                        {user.is_active ? t('common.status.active') : t('common.status.inactive')}
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
                          disabled={user.username === 'goksche' || user.role === 'power_admin' || user.role === 'admin'}
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
