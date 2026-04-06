import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { profileService, UserProfile } from '../services/profileService';
import { ArrowLeft, UserCircle, Camera, Trash, Link as LinkIcon, LinkBreak } from 'phosphor-react';

function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const basePath = typeof window !== 'undefined' && (window as any).BASE_PATH
    ? String((window as any).BASE_PATH).replace(/\/$/, '')
    : '';
  return `${window.location.origin}${basePath}${normalizedPath}`;
}

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [club, setClub] = useState('');
  const [bio, setBio] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [linkedParticipant, setLinkedParticipant] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await profileService.getMyProfile();
        setProfile(p);
        setDisplayName(p.display_name || '');
        setClub(p.club || '');
        setBio(p.bio || '');
        setIsPrivate(p.is_private);
      } catch {
        setError(t('profile.edit.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await profileService.updateMyProfile({
        display_name: displayName || undefined,
        club: club || undefined,
        bio: bio || undefined,
        is_private: isPrivate,
      });
      setProfile(updated);
      setSuccess(t('profile.edit.saved'));
    } catch {
      setError(t('profile.edit.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(t('profile.edit.fileTooLarge'));
      return;
    }
    setUploading(true);
    setError('');
    try {
      const updated = await profileService.uploadAvatar(file);
      setProfile(updated);
      setSuccess(t('profile.edit.uploadSuccess'));
    } catch {
      setError(t('profile.edit.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm(t('profile.edit.deleteConfirm'))) return;
    try {
      const updated = await profileService.deleteAvatar();
      setProfile(updated);
      setSuccess(t('profile.edit.deleteSuccess'));
    } catch {
      setError(t('profile.edit.deleteError'));
    }
  };

  const handleUnlink = async () => {
    if (!confirm(t('profile.edit.unlinkConfirm'))) return;
    try {
      await profileService.unlinkParticipant();
      setLinkedParticipant(null);
      setSuccess(t('profile.edit.unlinkSuccess'));
    } catch {
      setError(t('profile.edit.unlinkError'));
    }
  };

  if (loading) return <div className="p-8 text-foreground">{t('common.loadingShort')}</div>;

  const avatarSrc = resolveAvatarUrl(profile?.avatar_url);

  return (
    <div className="p-8 max-w-[700px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <UserCircle size={26} className="text-foreground" />
          <h1 className="m-0 text-foreground">{t('profile.edit.title')}</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} className="mr-2" /> {t('common.back')}
        </Button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg border border-destructive bg-destructive/10 text-destructive text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-lg border border-green-500 bg-green-500/10 text-green-500 text-sm">{success}</div>}

      {/* Avatar */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="mt-0">{t('profile.edit.avatar')}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={64} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Camera size={16} /> {uploading ? t('profile.edit.uploading') : t('profile.edit.uploadImage')}
              </Button>
              {avatarSrc && (
                <Button variant="danger" onClick={handleAvatarDelete} className="gap-2">
                  <Trash size={16} /> {t('profile.edit.removeImage')}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">{t('profile.edit.imageHint')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Fields */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="mt-0">{t('profile.edit.profileData')}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.edit.emailLabel')}</label>
            <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">{user?.email || '–'}</p>
          </div>
          <Input
            label={t('profile.edit.displayName')}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={user?.username || ''}
          />
          <Input
            label={t('profile.edit.club')}
            value={club}
            onChange={(e) => setClub(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">{t('profile.edit.bio')}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={1000}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              placeholder={t('profile.edit.bioPlaceholder')}
            />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/1000</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            <span className="text-sm text-foreground">{t('profile.edit.isPrivate')}</span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end mb-6">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? t('profile.edit.saving') : t('profile.edit.save')}
        </Button>
      </div>

      {/* Participant Link Info */}
      {linkedParticipant && (
        <Card>
          <CardHeader><CardTitle className="mt-0">{t('profile.edit.participantLink')}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LinkIcon size={18} className="text-primary" />
                <span className="text-foreground">{t('profile.edit.linkedWith', { name: linkedParticipant })}</span>
              </div>
              <Button variant="secondary" onClick={handleUnlink} className="gap-2">
                <LinkBreak size={16} /> {t('profile.edit.unlink')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
