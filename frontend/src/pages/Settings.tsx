import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import {
  settingsService,
  DEFAULT_APP_SETTINGS,
  DEFAULT_USER_SETTINGS,
  UserSettings as UserSettingsType,
  extractApiErrorDetail,
} from '../services/settingsService';
import { AppSettings, LiveTickerSlideType } from '../types';
import { ArrowLeft, Sliders, User, Globe } from 'phosphor-react';
import { applyLayoutPreset } from '../utils/layout';
import { applyFontFamily, FONT_FAMILY_MAP } from '../utils/typography';
import { THEME_REGISTRY } from '../theme/themeRegistry';

const SLIDE_LABEL_KEYS: Record<LiveTickerSlideType, string> = {
  groups: 'settings.slides.groups',
  qualification: 'settings.slides.qualification',
  ko: 'settings.slides.ko',
};

export default function Settings() {
  const navigate = useNavigate();
  const { isPowerAdmin } = useAuth();
  const { t } = useTranslation();

  // User-individual settings
  const [userSettings, setUserSettings] = useState<UserSettingsType>(DEFAULT_USER_SETTINGS);
  const [userLoading, setUserLoading] = useState(true);
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Global settings (admin only)
  const [globalSettings, setGlobalSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalSaving, setGlobalSaving] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const themeOptions = THEME_REGISTRY
    .filter((theme) => theme.selectableInSettings)
    .map((theme) => ({
      value: theme.id,
      label: theme.stage === 'preview' ? `${theme.label} (Preview)` : theme.label,
    }));

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const data = await settingsService.getUserSettings();
        setUserSettings(data);
      } catch {
        setUserError(t('settings.loadError'));
      } finally {
        setUserLoading(false);
      }
    };
    loadUserSettings();
  }, []);

  useEffect(() => {
    if (!isPowerAdmin) {
      setGlobalLoading(false);
      return;
    }
    const loadGlobal = async () => {
      try {
        const data = await settingsService.getGlobalSettings();
        setGlobalSettings(data);
      } catch {
        setGlobalError(t('settings.globalLoadError'));
      } finally {
        setGlobalLoading(false);
      }
    };
    loadGlobal();
  }, [isPowerAdmin]);

  const handleUserSave = async () => {
    setUserSaving(true);
    setUserError(null);
    setUserSuccess(null);
    try {
      const saved = await settingsService.updateUserSettings(userSettings);
      setUserSettings(saved);
      applyLayoutPreset(saved.layout as any);
      applyFontFamily(saved.font_family as any);
      setUserSuccess(t('settings.saved'));
    } catch (err) {
      const detail = extractApiErrorDetail(err);
      setUserError(detail ? `${t('common.error.saveFailed')}: ${detail}` : t('common.error.saveFailed'));
    } finally {
      setUserSaving(false);
    }
  };

  // --- Global settings handlers (admin only) ---

  const updateLiveTicker = (patch: Partial<AppSettings['live_ticker']>) => {
    setGlobalSettings(prev => ({
      ...prev,
      live_ticker: { ...prev.live_ticker, ...patch },
    }));
  };

  const updateGlobalDashboard = (patch: Partial<AppSettings['dashboard']>) => {
    setGlobalSettings(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, ...patch },
    }));
  };

  const updateGlobalPlaceholders = (patch: Partial<AppSettings['placeholders']>) => {
    setGlobalSettings(prev => ({
      ...prev,
      placeholders: { ...prev.placeholders, ...patch },
    }));
  };

  const clampNumber = (value: string, min: number, max: number) => {
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    return Math.min(max, Math.max(min, num));
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const order = [...globalSettings.live_ticker.slide_order];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    updateLiveTicker({ slide_order: order });
  };

  const handleGlobalSave = async () => {
    setGlobalSaving(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const saved = await settingsService.updateGlobalSettings(globalSettings);
      setGlobalSettings(saved);
      setGlobalSuccess(t('settings.globalSaved'));
    } catch (err) {
      const detail = extractApiErrorDetail(err);
      setGlobalError(detail ? `${t('common.error.saveFailed')}: ${detail}` : t('common.error.saveFailed'));
    } finally {
      setGlobalSaving(false);
    }
  };

  if (userLoading || globalLoading) {
    return <div className="p-8 text-foreground">{t('common.loadingShort')}</div>;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Sliders size={26} className="text-foreground" />
          <h1 className="m-0 text-foreground">{t('settings.title')}</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          {t('common.back')}
        </Button>
      </div>

      {/* ===== USER SETTINGS (all roles) ===== */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <User size={20} className="text-primary" />
          <h2 className="m-0 text-foreground text-lg">{t('settings.mySettings')}</h2>
        </div>

        {userError && <div className="mb-4 text-destructive text-sm">{userError}</div>}
        {userSuccess && <div className="mb-4 text-green-500 text-sm">{userSuccess}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="mt-0">{t('settings.display')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label={t('settings.layout')}
                value={userSettings.layout}
                onChange={(e) => {
                  const v = e.target.value as UserSettingsType['layout'];
                  setUserSettings(prev => ({ ...prev, layout: v }));
                  applyLayoutPreset(v as any);
                }}
                options={themeOptions}
              />
              <Select
                label={t('settings.font')}
                value={userSettings.font_family}
                onChange={(e) => {
                  const v = e.target.value;
                  setUserSettings(prev => ({ ...prev, font_family: v }));
                  applyFontFamily(v as any);
                }}
                options={Object.keys(FONT_FAMILY_MAP).map((font) => ({
                  value: font,
                  label: font,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mt-0">{t('settings.dashboardGeneral')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label={t('settings.defaultSort')}
                value={userSettings.dashboard_sort}
                onChange={(e) => setUserSettings(prev => ({ ...prev, dashboard_sort: e.target.value as any }))}
                options={[
                  { value: 'date', label: t('settings.sortDate') },
                  { value: 'name', label: t('settings.sortName') },
                  { value: 'status', label: t('settings.sortStatus') },
                ]}
              />
              <Input
                label={t('settings.language')}
                value={userSettings.language}
                onChange={(e) => setUserSettings(prev => ({ ...prev, language: e.target.value }))}
                disabled
              />
              <Input
                label={t('settings.timezone')}
                value={userSettings.timezone}
                onChange={(e) => setUserSettings(prev => ({ ...prev, timezone: e.target.value }))}
                disabled
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="primary" onClick={handleUserSave} disabled={userSaving}>
            {userSaving ? t('common.saving') : t('settings.saveMySettings')}
          </Button>
        </div>
      </div>

      {/* ===== GLOBAL SETTINGS (admin only) ===== */}
      {isPowerAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Globe size={20} className="text-primary" />
            <h2 className="m-0 text-foreground text-lg">{t('settings.globalTitle')}</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t('settings.globalDescription')}
          </p>

          {globalError && <div className="mb-4 text-destructive text-sm">{globalError}</div>}
          {globalSuccess && <div className="mb-4 text-green-500 text-sm">{globalSuccess}</div>}

          <div className="grid grid-cols-[2fr_1fr] gap-6">
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="mt-0">{t('settings.liveTicker')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={t('settings.slideDuration')}
                      type="number"
                      min={5}
                      max={60}
                      value={globalSettings.live_ticker.slide_duration_sec}
                      onChange={(e) => {
                        const val = clampNumber(e.target.value, 5, 60);
                        if (val !== null) updateLiveTicker({ slide_duration_sec: val });
                      }}
                    />
                    <Input
                      label={t('settings.refreshInterval')}
                      type="number"
                      min={10}
                      max={120}
                      value={globalSettings.live_ticker.refresh_interval_sec}
                      onChange={(e) => {
                        const val = clampNumber(e.target.value, 10, 120);
                        if (val !== null) updateLiveTicker({ refresh_interval_sec: val });
                      }}
                    />
                  </div>

                  <div className="mb-4">
                    <div className="font-semibold mb-2 text-foreground">{t('settings.slideOrder')}</div>
                    {globalSettings.live_ticker.slide_order.map((slide, idx) => (
                      <div key={`${slide}-${idx}`} className="flex items-center gap-2 mb-2">
                        <div className="flex-1 text-foreground">{t(SLIDE_LABEL_KEYS[slide])}</div>
                        <Button variant="secondary" onClick={() => moveSlide(idx, -1)} disabled={idx === 0}>{t('settings.slideUp')}</Button>
                        <Button variant="secondary" onClick={() => moveSlide(idx, 1)} disabled={idx === globalSettings.live_ticker.slide_order.length - 1}>{t('settings.slideDown')}</Button>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div className="font-semibold mb-2 text-foreground">{t('settings.slideFilter')}</div>
                    {(['groups', 'qualification', 'ko'] as LiveTickerSlideType[]).map((key) => (
                      <label key={key} className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={globalSettings.live_ticker.slides_enabled[key]}
                          onChange={(e) => updateLiveTicker({
                            slides_enabled: { ...globalSettings.live_ticker.slides_enabled, [key]: e.target.checked },
                          })}
                        />
                        <span className="text-foreground">{t(SLIDE_LABEL_KEYS[key])}</span>
                      </label>
                    ))}
                  </div>

                  <div className="mb-4">
                    <div className="font-semibold mb-2 text-foreground">{t('settings.displayDetails')}</div>
                    {[
                      { key: 'only_running_group_matches', label: t('settings.onlyRunningMatches') },
                      { key: 'show_spielfeld', label: t('settings.showSpielfeld') },
                      { key: 'show_results', label: t('settings.showResults') },
                      { key: 'mark_decision_matches', label: t('settings.markDecisionMatches') },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(globalSettings.live_ticker as any)[key]}
                          onChange={(e) => updateLiveTicker({ [key]: e.target.checked })}
                        />
                        <span className="text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>

                  <Select
                    label={t('settings.maxGroupsPerSlide')}
                    value={globalSettings.live_ticker.max_groups_per_slide}
                    onChange={(e) => updateLiveTicker({ max_groups_per_slide: Number(e.target.value) as 1 | 2 })}
                    options={[
                      { value: 1, label: t('settings.oneGroupPerSlide') },
                      { value: 2, label: t('settings.twoGroupsPerSlide') },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="mt-0">{t('settings.defaultDisplay')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label={t('settings.defaultLayout')}
                    value={globalSettings.placeholders.layout}
                    onChange={(e) => updateGlobalPlaceholders({ layout: e.target.value as any })}
                    options={themeOptions}
                  />
                  <Select
                    label={t('settings.defaultFont')}
                    value={globalSettings.placeholders.font_family}
                    onChange={(e) => updateGlobalPlaceholders({ font_family: e.target.value as any })}
                    options={Object.keys(FONT_FAMILY_MAP).map((font) => ({ value: font, label: font }))}
                  />
                  <Select
                    label={t('settings.defaultSort')}
                    value={globalSettings.dashboard.default_sort}
                    onChange={(e) => updateGlobalDashboard({ default_sort: e.target.value as any })}
                    options={[
                      { value: 'date', label: t('settings.sortDate') },
                      { value: 'name', label: t('settings.sortName') },
                      { value: 'status', label: t('settings.sortStatus') },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="primary" onClick={handleGlobalSave} disabled={globalSaving}>
              {globalSaving ? t('common.saving') : t('settings.saveGlobalSettings')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
