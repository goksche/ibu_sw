// Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Card, Input, Button } from '../components/ui';
import { theme } from '../theme/theme';
import { Envelope, Key } from 'phosphor-react';

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const response = await authService.sendOTP(email);
      if (response.dev_otp_code) {
        setInfo(`DEV-OTP: ${response.dev_otp_code}`);
      } else {
        setInfo('OTP wurde per E-Mail versendet.');
      }
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.verifyOTP(email, otpCode);
      await refreshUser();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ungültiger oder abgelaufener Code');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setOtpCode('');
    setError('');
    setInfo('');
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: theme.colors.background.primary,
      }}
    >
      <Card style={{ width: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1
            style={{
              margin: 0,
              color: theme.colors.text.primary,
              fontSize: '1.5rem',
              fontWeight: 'bold',
              letterSpacing: '2px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            IBU Turniere
          </h1>
          <p
            style={{
              margin: '0.25rem 0 0',
              color: theme.colors.text.secondary,
              fontSize: '0.75rem',
              letterSpacing: '1px',
            }}
          >
            Turnier-Verwaltung
          </p>
        </div>

        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: theme.colors.text.secondary }}>
          Login
        </h2>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <Input
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />

            {info && (
              <div
                style={{
                  color: theme.colors.accent.primary,
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: `${theme.colors.accent.primary}15`,
                  border: `1px solid ${theme.colors.accent.primary}`,
                  borderRadius: theme.borderRadius.card,
                }}
              >
                {info}
              </div>
            )}

            {error && (
              <div
                style={{
                  color: theme.colors.accent.error,
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: `${theme.colors.accent.error}20`,
                  border: `1px solid ${theme.colors.accent.error}`,
                  borderRadius: theme.borderRadius.card,
                }}
              >
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" disabled={loading} fullWidth>
              {loading ? 'Code wird gesendet...' : (
                <>
                  <Envelope size={18} /> Code anfordern
                </>
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleOTPSubmit}>
            <Input
              label="Einmal-Code"
              type="text"
              value={otpCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value)}
              required
            />

            {error && (
              <div
                style={{
                  color: theme.colors.accent.error,
                  marginBottom: '1rem',
                  padding: '0.75rem',
                  background: `${theme.colors.accent.error}20`,
                  border: `1px solid ${theme.colors.accent.error}`,
                  borderRadius: theme.borderRadius.card,
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button type="button" variant="secondary" onClick={handleBack} fullWidth>
                Zurück
              </Button>
              <Button type="submit" variant="primary" disabled={loading} fullWidth>
                {loading ? 'Wird geprüft...' : (
                  <>
                    <Key size={18} /> Anmelden
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}