// Settings Page (Admin)
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { settingsService, DEFAULT_APP_SETTINGS } from '../services/settingsService';
import { AppSettings, LiveTickerSlideType } from '../types';
import { ArrowLeft, Sliders, Users, MapPin, UserGear, ListBullets } from 'phosphor-react';
import { applyLayoutPreset } from '../utils/layout';
import { applyFontFamily, FONT_FAMILY_MAP } from '../utils/typography';

const SLIDE_LABELS: Record<LiveTickerSlideType, string> = {
  groups: 'Gruppen',
  qualification: 'Qualifikation',
  ko: 'KO-Phase',
};

export default function Settings() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Einstellungen konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  const updateLiveTicker = (patch: Partial<AppSettings['live_ticker']>) => {
    setSettings(prev => ({
      ...prev,
      live_ticker: { ...prev.live_ticker, ...patch },
    }));
  };

  const updateDashboard = (patch: Partial<AppSettings['dashboard']>) => {
    setSettings(prev => ({
      ...prev,
      dashboard: { ...prev.dashboard, ...patch },
    }));
  };

  const updatePlaceholders = (patch: Partial<AppSettings['placeholders']>) => {
    setSettings(prev => ({
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
    const order = [...settings.live_ticker.slide_order];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    updateLiveTicker({ slide_order: order });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await settingsService.updateSettings(settings);
      setSettings(saved);
      setSuccess('Einstellungen gespeichert.');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-foreground">Zugriff verweigert</h2>
        <p className="text-muted-foreground">Sie haben keine Berechtigung für diese Seite.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-foreground">Lädt...</div>;
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Sliders size={26} className="text-foreground" />
          <h1 className="m-0 text-foreground">Einstellungen</h1>
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} className="mr-2 align-middle" />
          Zurück
        </Button>
      </div>

      {error && (
        <div className="mb-4 text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 text-success">
          {success}
        </div>
      )}

      <div className="grid grid-cols-[2fr_1fr] gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="mt-0">Live‑Ticker</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Umschaltzeit (Sek.)"
                  type="number"
                  min={5}
                  max={60}
                  value={settings.live_ticker.slide_duration_sec}
                  onChange={(e) => {
                    const val = clampNumber(e.target.value, 5, 60);
                    if (val !== null) updateLiveTicker({ slide_duration_sec: val });
                  }}
                />
                <Input
                  label="Refresh‑Intervall (Sek.)"
                  type="number"
                  min={10}
                  max={120}
                  value={settings.live_ticker.refresh_interval_sec}
                  onChange={(e) => {
                    const val = clampNumber(e.target.value, 10, 120);
                    if (val !== null) updateLiveTicker({ refresh_interval_sec: val });
                  }}
                />
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-2 text-foreground">Folien‑Reihenfolge</div>
                {settings.live_ticker.slide_order.map((slide, idx) => (
                  <div key={`${slide}-${idx}`} className="flex items-center gap-2 mb-2">
                    <div className="flex-1 text-foreground">{SLIDE_LABELS[slide]}</div>
                    <Button
                      variant="secondary"
                      onClick={() => moveSlide(idx, -1)}
                      disabled={idx === 0}
                    >
                      Hoch
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => moveSlide(idx, 1)}
                      disabled={idx === settings.live_ticker.slide_order.length - 1}
                    >
                      Runter
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-2 text-foreground">Folien‑Filter</div>
                {(['groups', 'qualification', 'ko'] as LiveTickerSlideType[]).map((key) => (
                  <label key={key} className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.live_ticker.slides_enabled[key]}
                      onChange={(e) => updateLiveTicker({
                        slides_enabled: {
                          ...settings.live_ticker.slides_enabled,
                          [key]: e.target.checked,
                        },
                      })}
                    />
                    <span className="text-foreground">{SLIDE_LABELS[key]}</span>
                  </label>
                ))}
              </div>

              <div className="mb-4">
                <div className="font-semibold mb-2 text-foreground">Anzeige‑Details</div>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.live_ticker.only_running_group_matches}
                    onChange={(e) => updateLiveTicker({ only_running_group_matches: e.target.checked })}
                  />
                  <span className="text-foreground">Nur laufende Gruppenspiele</span>
                </label>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.live_ticker.show_spielfeld}
                    onChange={(e) => updateLiveTicker({ show_spielfeld: e.target.checked })}
                  />
                  <span className="text-foreground">Spielfeld anzeigen</span>
                </label>
                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.live_ticker.show_results}
                    onChange={(e) => updateLiveTicker({ show_results: e.target.checked })}
                  />
                  <span className="text-foreground">Ergebnis anzeigen</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.live_ticker.mark_decision_matches}
                    onChange={(e) => updateLiveTicker({ mark_decision_matches: e.target.checked })}
                  />
                  <span className="text-foreground">Entscheidungsspiele markieren</span>
                </label>
              </div>

              <Select
                label="Max Gruppen pro Folie"
                value={settings.live_ticker.max_groups_per_slide}
                onChange={(e) => updateLiveTicker({ max_groups_per_slide: Number(e.target.value) as 1 | 2 })}
                options={[
                  { value: 1, label: '1 Gruppe pro Folie' },
                  { value: 2, label: '2 Gruppen pro Folie' },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mt-0">Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                label="Standard‑Sortierung"
                value={settings.dashboard.default_sort}
                onChange={(e) => updateDashboard({ default_sort: e.target.value as AppSettings['dashboard']['default_sort'] })}
                options={[
                  { value: 'date', label: 'Datum' },
                  { value: 'name', label: 'Name' },
                  { value: 'status', label: 'Status' },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="mt-0">Platzhalter‑Einstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Schriftart"
                value={settings.placeholders.font_family}
                onChange={(e) => {
                  const fontValue = e.target.value as AppSettings['placeholders']['font_family'];
                  updatePlaceholders({ font_family: fontValue });
                  applyFontFamily(fontValue);
                }}
                options={Object.keys(FONT_FAMILY_MAP).map((font) => ({
                  value: font,
                  label: font,
                }))}
              />
              <Input
                label="Sprache"
                value={settings.placeholders.language}
                onChange={(e) => updatePlaceholders({ language: e.target.value })}
                disabled
              />
              <Input
                label="Zeitzone"
                value={settings.placeholders.timezone}
                onChange={(e) => updatePlaceholders({ timezone: e.target.value })}
                disabled
              />
              <Select
                label="Layout"
                value={settings.placeholders.layout}
                onChange={(e) => {
                  const layoutValue = e.target.value as AppSettings['placeholders']['layout'];
                  updatePlaceholders({ layout: layoutValue });
                  applyLayoutPreset(layoutValue);
                }}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'neon', label: 'NeonGreen' },
                  { value: 'neon_yellow', label: 'NeonYellow' },
                  { value: 'neon_cyan', label: 'NeonCyan' },
                  { value: 'neon_blue', label: 'NeonBlue' },
                ]}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Speichere...' : 'Speichern'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="mt-0">Verwaltung</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Button variant="secondary" onClick={() => navigate('/participants')}>
                  <Users size={18} className="mr-2 align-middle" />
                  Teilnehmerverwaltung
                </Button>
                <Button variant="secondary" onClick={() => navigate('/locations')}>
                  <MapPin size={18} className="mr-2 align-middle" />
                  Spielorte
                </Button>
                <Button variant="secondary" onClick={() => navigate('/admin/users')}>
                  <UserGear size={18} className="mr-2 align-middle" />
                  Benutzerverwaltung
                </Button>
                <Button variant="secondary" onClick={() => navigate('/admin/logs')}>
                  <ListBullets size={18} className="mr-2 align-middle" />
                  Logs
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
