// Admin User Management
import { useState, useEffect } from 'react';
import { platformService } from '../../services/platformService';
import { User } from '../../types';
import { Button, Input, Card } from '../../components/ui';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await platformService.getUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Benutzerverwaltung</h1>
      <div style={{ marginBottom: '1rem' }}>
        <Button>Neuer Benutzer</Button>
      </div>
      <div>
        {users.map((user) => (
          <Card key={user.id} style={{ marginBottom: '1rem', padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>{user.username}</h3>
                <p>{user.email}</p>
                <p>Rolle: {user.role}</p>
              </div>
              <div>
                <Button>Bearbeiten</Button>
                <Button>Löschen</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

