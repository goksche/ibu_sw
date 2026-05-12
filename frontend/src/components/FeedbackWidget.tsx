// Feedback Widget - Embeddable in apps
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import FeedbackForm from './FeedbackForm';
import { resolveFeedbackAppId } from '../config/feedbackApp';

interface FeedbackWidgetProps {
  appId?: number;
}

export default function FeedbackWidget({ appId: appIdProp }: FeedbackWidgetProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [appId, setAppId] = useState<number | null>(appIdProp ?? null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (appIdProp != null) {
      setAppId(appIdProp);
      return;
    }
    if (!showForm || appId != null) return;
    let cancelled = false;
    (async () => {
      try {
        const id = await resolveFeedbackAppId();
        if (!cancelled) setAppId(id);
      } catch {
        if (!cancelled) setAppId(1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appIdProp, showForm, appId]);

  const pageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}${window.location.search}`
      : '';

  if (success) {
    return (
      <div className="max-w-md rounded-lg border border-border bg-card p-4 text-sm text-foreground">
        <p className="m-0 mb-3">{t('feedback.success')}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSuccess(false);
            setShowForm(false);
          }}
        >
          {t('feedback.widgetClose')}
        </Button>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button type="button" variant="secondary" onClick={() => setShowForm(true)}>
        {t('feedback.widgetOpen')}
      </Button>
    );
  }

  if (appId === null) {
    return <div className="text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <FeedbackForm
      appId={appId}
      pageUrl={pageUrl}
      compact
      onSubmitted={() => {
        setSuccess(true);
      }}
      onCancel={() => setShowForm(false)}
    />
  );
}
