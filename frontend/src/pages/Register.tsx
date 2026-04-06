import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Button } from '../components/ui';
import { Envelope, Key, UserPlus, CheckCircle } from 'phosphor-react';
import { registrationService } from '../services/registrationService';
import Footer from '../components/Footer';
import AnimatedCyberBackdrop from '../components/AnimatedCyberBackdrop';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { formatAuthFlowError } from '../utils/authErrors';

type Step = 'form' | 'otp' | 'done';

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const normalizedLastName = lastName.trim();
      const res = await registrationService.register({
        email,
        first_name: firstName.trim(),
        last_name: normalizedLastName || undefined,
      });

      if (res.dev_otp_code) {
        setInfo(`DEV-OTP: ${res.dev_otp_code}`);
        try {
          await registrationService.verifyOTP(email, res.dev_otp_code);
          setStep('done');
          return;
        } catch (err: any) {
          setError(err.response?.data?.detail || t('register.verificationFailed'));
          return;
        }
      } else {
        setInfo(t('register.codeSentInfo'));
      }
      setStep('otp');
    } catch (err: unknown) {
      setError(formatAuthFlowError(err, t, { fallbackKey: 'register.registrationFailed' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await registrationService.verifyOTP(email, otpCode);
      setStep('done');
    } catch (err: unknown) {
      setError(formatAuthFlowError(err, t, { fallbackKey: 'register.invalidCode' }));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('form');
    setOtpCode('');
    setError('');
    setInfo('');
  };

  const inputClassName = 'border-[rgba(0,212,255,0.15)] bg-[rgba(255,255,255,0.03)] text-[#e8eaf0] placeholder:text-[#6f7690] focus-visible:ring-[rgba(0,212,255,0.45)]';

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#04050d] text-[#e8eaf0]">
      <AnimatedCyberBackdrop />

      <div className="absolute top-4 right-4 z-[1400] pointer-events-auto">
        <LanguageSwitcher />
      </div>

      <div className="relative z-[10] flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-[440px] border-[rgba(0,212,255,0.18)] bg-[rgba(8,12,26,0.82)] text-[#e8eaf0] shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(0,212,255,0.2)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#00d4ff]">
              <span className="h-2 w-2 rounded-full bg-[#00d4ff]" />
              Account Registration
            </div>
            <CardTitle className="text-3xl font-semibold tracking-tight text-[#f4f8ff]">{t('login.appName')}</CardTitle>
            <CardDescription className="text-[#8f96ad]">{t('login.appDescription')}</CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'form' && (
              <>
                <h2 className="mb-6 text-center text-xl font-semibold text-[#f4f8ff]">{t('register.title')}</h2>
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <Input
                    className={inputClassName}
                    label={t('register.firstName')}
                    type="text"
                    value={firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
                    required
                  />
                  <Input
                    className={inputClassName}
                    label={t('register.lastName')}
                    type="text"
                    value={lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
                  />
                  <Input
                    className={inputClassName}
                    label={t('register.email')}
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
                    {loading ? t('register.sending') : (
                      <>
                        <Envelope size={18} /> {t('register.sendCode')}
                      </>
                    )}
                  </Button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => navigate('/login')}
                      className="cursor-pointer border-none bg-transparent text-sm text-[#7ae8ff] hover:underline"
                    >
                      {t('register.alreadyAccount')}
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 'otp' && (
              <>
                <h2 className="mb-6 text-center text-xl font-semibold text-[#f4f8ff]">{t('register.codeTitle')}</h2>
                <form onSubmit={handleOTPSubmit} className="space-y-4">
                  <p className="text-center text-sm text-[#8f96ad]" dangerouslySetInnerHTML={{ __html: t('register.codeSent', { email }) }} />
                  <Input
                    className={inputClassName}
                    label={t('register.confirmationCode')}
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
                      {loading ? t('register.verifying') : (
                        <>
                          <Key size={18} /> {t('register.confirm')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {step === 'done' && (
              <div className="space-y-4 py-4 text-center">
                <CheckCircle size={48} weight="fill" className="mx-auto text-emerald-300" />
                <h2 className="text-xl font-semibold text-[#f4f8ff]">{t('register.emailVerified')}</h2>
                <p className="text-[#8f96ad]">
                  {t('register.submittedMessage')}
                </p>
                <p className="text-sm text-[#8f96ad]">
                  {t('register.notificationMessage')}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  className="mt-4 gap-2 border border-[rgba(0,212,255,0.18)] bg-[rgba(255,255,255,0.04)] text-[#c6d0ec] hover:bg-[rgba(255,255,255,0.08)]"
                >
                  <UserPlus size={18} /> {t('register.goToLogin')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
