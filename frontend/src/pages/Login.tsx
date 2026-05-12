// Login Page — UI/Layout eingefroren (siehe .cursor/rules/no-login-auth-changes.mdc)
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Card, Input, Button } from '../components/ui';
import { theme } from '../theme/theme';
import { Envelope, Key } from 'phosphor-react';
import Footer from '../components/Footer';
import { formatAuthFlowError } from '../utils/authErrors';

export default function Login() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
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
        setInfo(t('login.otpSent'));
      }
      setStep('otp');
    } catch (err: unknown) {
      setError(formatAuthFlowError(err, t));
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
    } catch (err: unknown) {
      setError(formatAuthFlowError(err, t));
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
        flexDirection: 'column',
        minHeight: '100vh',
        background: theme.colors.background.primary,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flex: '1',
        }}
      >
        <Card className="w-full max-w-[400px] p-6">
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
              {t('login.appName')}
            </h1>
            <p
              style={{
                margin: '0.25rem 0 0',
                color: theme.colors.text.secondary,
                fontSize: '0.75rem',
                letterSpacing: '1px',
              }}
            >
              {t('login.appDescription')}
            </p>
          </div>

          <h2
            style={{
              marginBottom: '1.5rem',
              textAlign: 'center',
              color: theme.colors.text.secondary,
            }}
          >
            {t('login.title')}
          </h2>

          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label={t('login.email')}
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

              <Button type="submit" variant="primary" disabled={loading} className="w-full gap-2">
                {loading ? (
                  t('login.sendingCode')
                ) : (
                  <>
                    <Envelope size={18} /> {t('login.sendCode')}
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <Input
                label={t('login.otpCode')}
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

              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
                  {t('common.back')}
                </Button>
                <Button type="submit" variant="primary" disabled={loading} className="flex-1 gap-2">
                  {loading ? (
                    t('login.verifying')
                  ) : (
                    <>
                      <Key size={18} /> {t('login.verify')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}
