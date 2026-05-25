// Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { theme } from '../theme/theme';
import { SignIn } from 'phosphor-react';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login({ username, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: theme.colors.background.primary
    }}>
      <Card style={{ width: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <SignIn size={48} color={theme.colors.accent.primary} weight="bold" style={{ marginBottom: '0.5rem' }} />
          <h1 style={{ margin: 0, color: theme.colors.text.primary }}>IBU Turniere</h1>
        </div>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: theme.colors.text.secondary }}>Login</h2>
        
        <form onSubmit={handleSubmit}>
          <Input
            label="Benutzername"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            error={error ? undefined : undefined}
          />
          
          <Input
            label="Passwort"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            error={error ? undefined : undefined}
          />
          
          {error && (
            <div style={{ 
              color: theme.colors.accent.error, 
              marginBottom: '1rem', 
              padding: '0.75rem',
              background: `${theme.colors.accent.error}20`,
              border: `1px solid ${theme.colors.accent.error}`,
              borderRadius: theme.borderRadius.card
            }}>
              {error}
            </div>
          )}
          
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            fullWidth
          >
            {loading ? 'Wird angemeldet...' : 'Anmelden'}
          </Button>
        </form>
        
        <p style={{ marginTop: '1rem', textAlign: 'center', color: theme.colors.text.secondary, fontSize: '0.875rem' }}>
          Test: admin / secret123
        </p>
      </Card>
    </div>
  );
}
