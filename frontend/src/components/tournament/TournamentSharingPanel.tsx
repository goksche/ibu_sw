import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { sharingService, Share, Visibility } from '../../services/sharingService';
import { Globe, Lock, UsersThree, Envelope, Trash, Plus } from 'phosphor-react';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  entityType: 'tournament' | 'league';
  entityId: number;
  currentVisibility: Visibility;
  onVisibilityChange?: (v: Visibility) => void;
}

export default function TournamentSharingPanel({ entityType, entityId, currentVisibility, onVisibilityChange }: Props) {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: React.ReactNode; desc: string }[] = [
    { value: 'public', label: t('sharing.public'), icon: <Globe size={18} />, desc: t('sharing.publicDesc') },
    { value: 'shared', label: t('sharing.shared'), icon: <UsersThree size={18} />, desc: t('sharing.sharedDesc') },
    { value: 'private', label: t('sharing.private'), icon: <Lock size={18} />, desc: t('sharing.privateDesc') },
  ];
  const [visibility, setVisibility] = useState<Visibility>(currentVisibility);
  const [shares, setShares] = useState<Share[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPermission, setNewPermission] = useState<'view' | 'edit'>('view');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setVisibility(currentVisibility);
  }, [currentVisibility]);

  useEffect(() => {
    if (visibility !== 'public') {
      loadShares();
    }
  }, [visibility, entityId]);

  const loadShares = async () => {
    try {
      const data = entityType === 'tournament'
        ? await sharingService.getTournamentShares(entityId)
        : await sharingService.getLeagueShares(entityId);
      setShares(data);
    } catch {
      // ignore
    }
  };

  const handleVisibilityChange = async (v: Visibility) => {
    try {
      if (entityType === 'tournament') {
        await sharingService.setTournamentVisibility(entityId, v);
      } else {
        await sharingService.setLeagueVisibility(entityId, v);
      }
      setVisibility(v);
      onVisibilityChange?.(v);
    } catch {
      setError(t('sharing.visibilityError'));
    }
  };

  const handleAddShare = async () => {
    if (!newEmail.trim()) return;
    setLoading(true);
    setError('');
    try {
      if (entityType === 'tournament') {
        await sharingService.shareTournament(entityId, newEmail.trim(), newPermission);
      } else {
        await sharingService.shareLeague(entityId, newEmail.trim(), newPermission);
      }
      setNewEmail('');
      await loadShares();
      if (visibility === 'public') {
        setVisibility('shared');
        onVisibilityChange?.('shared');
      }
    } catch {
      setError(t('sharing.shareError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: number) => {
    try {
      if (entityType === 'tournament') {
        await sharingService.removeTournamentShare(entityId, shareId);
      } else {
        await sharingService.removeLeagueShare(entityId, shareId);
      }
      await loadShares();
    } catch {
      setError(t('sharing.removeError'));
    }
  };

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="mt-0">{t('sharing.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleVisibilityChange(opt.value)}
              className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border cursor-pointer transition-colors text-sm ${
                visibility === opt.value
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent/40'
              }`}
            >
              {opt.icon}
              <span className="font-medium">{opt.label}</span>
              <span className={`text-xs ${visibility === opt.value ? 'opacity-90' : 'opacity-80'}`}>
                {opt.desc}
              </span>
            </button>
          ))}
        </div>

        {visibility !== 'public' && (
          <>
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">{t('sharing.inviteTitle')}</h4>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder={t('sharing.emailPlaceholder')}
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddShare()}
                  />
                </div>
                <select
                  value={newPermission}
                  onChange={(e) => setNewPermission(e.target.value as 'view' | 'edit')}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground"
                >
                  <option value="view">{t('sharing.permissionView')}</option>
                  <option value="edit">{t('sharing.permissionEdit')}</option>
                </select>
                <Button variant="primary" onClick={handleAddShare} disabled={loading || !newEmail.trim()} className="gap-1">
                  <Plus size={16} /> {t('sharing.invite')}
                </Button>
              </div>
            </div>

            {shares.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">{t('sharing.sharedUsers')}</h4>
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                    <div className="flex items-center gap-2">
                      <Envelope size={16} className="text-muted-foreground" />
                      <span className="text-sm text-foreground">{share.shared_with_email}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-background text-muted-foreground border border-border">
                        {share.permission === 'edit' ? t('sharing.permissionEdit') : t('sharing.permissionView')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveShare(share.id)}
                      className="text-destructive hover:text-destructive/80 bg-transparent border-none cursor-pointer p-1"
                    >
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
