// Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Button } from '../components/ui';
import { Envelope, Key } from 'phosphor-react';
import Footer from '../components/Footer';

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
        try {
          await authService.verifyOTP(email, response.dev_otp_code);
          await refreshUser();
          navigate('/dashboard');
          return;
        } catch (err: any) {
          setError(err.response?.data?.detail || 'Login fehlgeschlagen');
          return;
        }
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
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex justify-center items-center flex-1">
        <Card className="w-[400px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">FinalStage.ch</CardTitle>
            <CardDescription>Turnier-Verwaltung</CardDescription>
          </CardHeader>

          <CardContent>
            <h2 className="text-xl font-semibold text-center text-foreground mb-6">Login</h2>

            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  label="E-Mail"
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                />

                {info && (
                  <div className="p-3 rounded-lg border border-primary bg-primary/10 text-primary text-sm">
                    {info}
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full gap-2">
                  {loading ? 'Code wird gesendet...' : (
                    <>
                      <Envelope size={18} /> Code anfordern
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <Input
                  label="Einmal-Code"
                  type="text"
                  value={otpCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value)}
                  required
                />

                {error && (
                  <div className="p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={handleBack} className="flex-1">
                    Zurück
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1 gap-2">
                    {loading ? 'Wird geprüft...' : (
                      <>
                        <Key size={18} /> Anmelden
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
