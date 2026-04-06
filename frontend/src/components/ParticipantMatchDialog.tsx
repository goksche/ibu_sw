import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { profileService, ParticipantMatch } from '../services/profileService';
import { Link, X } from 'phosphor-react';

export default function ParticipantMatchDialog() {
  const { t } = useTranslation();
  const [match, setMatch] = useState<ParticipantMatch | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await profileService.checkParticipantMatch();
        if (result && !result.already_linked) {
          setMatch(result);
          setVisible(true);
        }
      } catch {
        // silently ignore
      }
    };
    check();
  }, []);

  const handleLink = async () => {
    if (!match) return;
    setLoading(true);
    try {
      await profileService.linkParticipant(match.participant_id);
      setVisible(false);
    } catch {
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!visible || !match) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-xl border border-border shadow-xl p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-foreground m-0">{t('participantMatch.title')}</h3>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <p className="text-foreground mb-2">
          {t('participantMatch.description')}
        </p>
        <div className="p-3 rounded-lg bg-muted mb-4">
          <p className="font-semibold text-foreground m-0">
            {match.first_name} {match.last_name}
          </p>
          {match.club && <p className="text-sm text-muted-foreground m-0 mt-1">{match.club}</p>}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('participantMatch.linkPrompt')}
        </p>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={handleDismiss}>
            {t('participantMatch.decline')}
          </Button>
          <Button variant="primary" onClick={handleLink} disabled={loading} className="gap-2">
            <Link size={16} /> {loading ? t('participantMatch.linking') : t('participantMatch.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
