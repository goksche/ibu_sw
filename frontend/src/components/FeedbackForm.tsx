import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button, Card, Input, Textarea } from './ui';
import { platformService } from '../services/platformService';
import { infoService } from '../services/infoService';
import { formatApiErrorMessage } from '../utils/apiErrors';
import { buildFeedbackDescriptionWithContext } from '../utils/feedbackSubmit';
import { FRONTEND_BUILD_VERSION } from '../appFrontendVersion';

export interface FeedbackFormProps {
  appId: number;
  /** Aktuelle Seite (vollständige URL inkl. Pfad, ggf. Query). */
  pageUrl: string;
  /** Kompakte Darstellung (z. B. Widget). */
  compact?: boolean;
  onSubmitted?: () => void;
  onCancel?: () => void;
}

const selectClass =
  'w-full rounded-md border border-border bg-card px-3 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export default function FeedbackForm({
  appId,
  pageUrl,
  compact = false,
  onSubmitted,
  onCancel,
}: FeedbackFormProps) {
  const { t } = useTranslation();
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature_request' | 'improvement' | 'other'>('bug');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendVersion, setBackendVersion] = useState<string | null>(null);
  const [backendName, setBackendName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await infoService.getVersion();
        if (!cancelled) {
          setBackendVersion(info.version);
          setBackendName(info.name);
        }
      } catch {
        if (!cancelled) {
          setBackendVersion(null);
          setBackendName(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const fullDescription = buildFeedbackDescriptionWithContext(description, {
        pageUrl,
        frontendVersion: FRONTEND_BUILD_VERSION,
        backendVersion: backendVersion ?? undefined,
        backendName: backendName ?? undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      await platformService.createFeedback({
        app_id: appId,
        feedback_type: feedbackType,
        title: title.trim(),
        description: fullDescription,
        priority,
      });
      setTitle('');
      setDescription('');
      onSubmitted?.();
    } catch (err) {
      setError(formatApiErrorMessage(err, t('feedback.errorGeneric')));
    } finally {
      setSubmitting(false);
    }
  };

  const cardClass = compact ? 'p-4' : 'p-6';

  return (
    <Card className={cn(cardClass, 'max-w-2xl')}>
      {!compact && (
        <>
          <h1 className="mt-0 mb-2 text-2xl font-semibold text-foreground">{t('feedback.pageTitle')}</h1>
          <p className="mt-0 mb-6 text-sm text-muted-foreground">{t('feedback.pageIntro')}</p>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">{t('feedback.type')}</label>
          <select
            value={feedbackType}
            onChange={(e) => setFeedbackType(e.target.value as typeof feedbackType)}
            className={selectClass}
            required
          >
            <option value="bug">{t('feedback.typeBug')}</option>
            <option value="feature_request">{t('feedback.typeFeature')}</option>
            <option value="improvement">{t('feedback.typeImprovement')}</option>
            <option value="other">{t('feedback.typeOther')}</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">{t('feedback.priority')}</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            className={selectClass}
            required
          >
            <option value="low">{t('feedback.priorityLow')}</option>
            <option value="medium">{t('feedback.priorityMedium')}</option>
            <option value="high">{t('feedback.priorityHigh')}</option>
            <option value="critical">{t('feedback.priorityCritical')}</option>
          </select>
        </div>

        <Input
          label={t('feedback.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />

        <Textarea
          label={t('feedback.description')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={compact ? 4 : 8}
          placeholder={t('feedback.descriptionPlaceholder')}
        />

        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="mt-0 mb-2 font-semibold text-foreground">{t('feedback.contextTitle')}</p>
          <ul className="m-0 list-none space-y-1 p-0 text-muted-foreground">
            <li>
              <span className="text-foreground/80">{t('feedback.contextUrl')}: </span>
              <span className="break-all">{pageUrl}</span>
            </li>
            <li>
              <span className="text-foreground/80">{t('feedback.contextFrontend')}: </span>
              {FRONTEND_BUILD_VERSION}
            </li>
            <li>
              <span className="text-foreground/80">{t('feedback.contextBackend')}: </span>
              {backendVersion ? `${backendName ?? 'API'} ${backendVersion}` : '—'}
            </li>
            <li>
              <span className="text-foreground/80">{t('feedback.contextUserAgent')}: </span>
              <span className="break-all text-xs opacity-90">
                {typeof navigator !== 'undefined' ? navigator.userAgent : '—'}
              </span>
            </li>
          </ul>
          <p className="mb-0 mt-2 text-xs text-muted-foreground">{t('feedback.contextHint')}</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? t('common.loading') : t('feedback.submit')}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
