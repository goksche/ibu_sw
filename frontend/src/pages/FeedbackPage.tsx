import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { resolveFeedbackAppId } from '../config/feedbackApp';
import FeedbackForm from '../components/FeedbackForm';
import { Card, Button } from '../components/ui';

export default function FeedbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [appId, setAppId] = useState<number | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const pageUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${location.pathname}${location.search}` : '';

  useEffect(() => {
    if (loading) return;
    if (!authService.isAuthenticated()) {
      navigate('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const id = await resolveFeedbackAppId();
        if (!cancelled) setAppId(id);
      } catch {
        if (!cancelled) {
          setResolveError(t('feedback.appResolveError'));
          setAppId(1);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, navigate, t]);

  if (loading || !isAuthenticated) {
    return <div className="p-8 text-foreground">{t('common.loading')}</div>;
  }

  if (appId === null) {
    return <div className="p-8 text-foreground">{t('common.loading')}</div>;
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6">
          <p className="m-0 mb-4 text-foreground">{t('feedback.success')}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="primary" onClick={() => setSent(false)}>
              {t('feedback.sendAnother')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
              {t('common.back')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {resolveError && (
        <div className="mb-4 rounded-md border border-warning bg-warning/15 px-3 py-2 text-sm text-warning">
          {resolveError}
        </div>
      )}
      <FeedbackForm appId={appId} pageUrl={pageUrl} onSubmitted={() => setSent(true)} />
    </div>
  );
}
