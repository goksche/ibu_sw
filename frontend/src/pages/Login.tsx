// Login Page
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Button } from '../components/ui';
import { Envelope, Key } from 'phosphor-react';
import Footer from '../components/Footer';
import AnimatedCyberBackdrop from '../components/AnimatedCyberBackdrop';
import LanguageSwitcher from '../components/LanguageSwitcher';
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
        // Keep user flow consistent: never show raw OTP code in UI.
        setInfo(t('login.otpSent'));
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#04050d] text-[#e8eaf0]">
      <AnimatedCyberBackdrop />

      <div className="absolute top-4 right-4 z-[1400] pointer-events-auto">
        <LanguageSwitcher />
      </div>

      <div className="relative z-[10] flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-[430px] border-[rgba(0,212,255,0.18)] bg-[rgba(8,12,26,0.82)] text-[#e8eaf0] shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(0,212,255,0.2)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#00d4ff]">
              <span className="h-2 w-2 rounded-full bg-[#00d4ff]" />
              Secure Login
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight text-[#f4f8ff]">{t('login.appName')}</CardTitle>
            <CardDescription className="text-[#8f96ad]">{t('login.appDescription')}</CardDescription>
          </CardHeader>

          <CardContent>
            <h2 className="mb-6 text-center text-xl font-semibold text-[#f4f8ff]">{t('login.title')}</h2>

            {step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <Input
                  className="border-[rgba(0,212,255,0.15)] bg-[rgba(255,255,255,0.03)] text-[#e8eaf0] placeholder:text-[#6f7690] focus-visible:ring-[rgba(0,212,255,0.45)]"
                  label={t('login.email')}
                  type="email"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                />

                {info && (
                  <div className="rounded-lg border border-[rgba(0,212,255,0.35)] bg-[rgba(0,212,255,0.12)] p-3 text-sm text-[#7ae8ff]">
                    {info}
                  </div>
                )}

                {error && (
                  <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 bg-[#00d4ff] font-semibold text-[#04050d] hover:bg-[#33dcff]"
                >
                  {loading ? t('login.sendingCode') : (
                    <>
                      <Envelope size={18} /> {t('login.sendCode')}
                    </>
                  )}
                </Button>

                <div className="text-center mt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/register')}
                    className="cursor-pointer border-none bg-transparent text-sm text-[#7ae8ff] hover:underline"
                  >
                    {t('login.noAccount')}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOTPSubmit} className="space-y-4">
                <Input
                  className="border-[rgba(0,212,255,0.15)] bg-[rgba(255,255,255,0.03)] text-[#e8eaf0] placeholder:text-[#6f7690] focus-visible:ring-[rgba(0,212,255,0.45)]"
                  label={t('login.otpCode')}
                  type="text"
                  value={otpCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value)}
                  required
                />

                {error && (
                  <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    className="flex-1 border border-[rgba(0,212,255,0.18)] bg-[rgba(255,255,255,0.04)] text-[#c6d0ec] hover:bg-[rgba(255,255,255,0.08)]"
                  >
                    {t('common.back')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 gap-2 bg-[#00d4ff] font-semibold text-[#04050d] hover:bg-[#33dcff]"
                  >
                    {loading ? t('login.verifying') : (
                      <>
                        <Key size={18} /> {t('login.verify')}
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
