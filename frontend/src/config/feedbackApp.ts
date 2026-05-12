import { platformService } from '../services/platformService';

/**
 * Plattform-App für Feedback-Einträge.
 * 1) VITE_FEEDBACK_APP_ID (falls gesetzt und > 0)
 * 2) Erste aktive App aus dem Dashboard
 * 3) Fallback 1 (üblicher IBU-App-Eintrag in der DB)
 */
export async function resolveFeedbackAppId(): Promise<number> {
  const raw = import.meta.env.VITE_FEEDBACK_APP_ID;
  const fromEnv = raw != null && raw !== '' ? Number.parseInt(String(raw), 10) : NaN;
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv;
  }
  try {
    const apps = await platformService.getDashboardApps();
    const active = apps.find((a) => a.status === 'active');
    if (active) return active.id;
    if (apps.length > 0) return apps[0].id;
  } catch {
    /* Dashboard nicht verfügbar (z. B. Rolle) — Fallback unten */
  }
  return 1;
}
