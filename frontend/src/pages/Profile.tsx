import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { profileService, ProfilePublic } from '../services/profileService';
import { ArrowLeft, UserCircle } from 'phosphor-react';

function resolveAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  const basePath = typeof window !== 'undefined' && (window as any).BASE_PATH
    ? String((window as any).BASE_PATH).replace(/\/$/, '')
    : '';
  return `${window.location.origin}${basePath}${normalizedPath}`;
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const p = await profileService.getPublicProfile(Number(id));
        setProfile(p);
      } catch {
        setError(t('profile.loadError'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <div className="p-8 text-foreground">{t('common.loadingShort')}</div>;

  if (error || !profile) {
    return (
      <div className="p-8 max-w-[600px] mx-auto text-center">
        <UserCircle size={64} className="text-muted-foreground mx-auto mb-4" />
        <h2 className="text-foreground mb-2">{t('profile.notAvailable')}</h2>
        <p className="text-muted-foreground mb-4">{error || t('profile.notAvailableDesc')}</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> {t('common.back')}
        </Button>
      </div>
    );
  }

  const avatarSrc = resolveAvatarUrl(profile.avatar_url);

  return (
    <div className="p-8 max-w-[600px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="m-0 text-foreground">{t('profile.title')}</h1>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> {t('common.back')}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle size={56} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground m-0">
                {profile.display_name || t('profile.unnamed')}
              </h2>
              {profile.club && (
                <p className="text-sm text-muted-foreground mt-1">{profile.club}</p>
              )}
            </div>
          </div>
          {profile.bio && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('profile.aboutMe')}</h3>
              <p className="text-foreground whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
