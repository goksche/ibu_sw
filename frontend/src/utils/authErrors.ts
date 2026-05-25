import type { TFunction } from 'i18next';

/** Axios / fetch: keine HTTP-Antwort (Netzwerk, Timeout, CORS, Proxy down) */
export function isNetworkOrServerUnreachable(error: unknown): boolean {
  const e = error as {
    response?: unknown;
    code?: string;
    message?: string;
  };
  if (e?.response) return false;
  if (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED') return true;
  if (typeof e?.message === 'string' && e.message.toLowerCase().includes('network')) return true;
  return false;
}

export type AuthFlowErrorKeys = {
  /** i18n-Key bei Netzwerkfehler (Default: login.networkError) */
  networkKey?: string;
  /** i18n-Key ohne detail vom Server (Default: login.failed) */
  fallbackKey?: string;
};

/** Login, Registrierung, OTP: klare Meldungen statt generischem „fehlgeschlagen“ */
export function formatAuthFlowError(error: unknown, t: TFunction, keys?: AuthFlowErrorKeys): string {
  if (isNetworkOrServerUnreachable(error)) {
    return t(keys?.networkKey || 'login.networkError');
  }
  const e = error as {
    response?: { data?: { detail?: string | Array<{ msg?: string }> } };
    message?: string;
  };
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const fb = keys?.fallbackKey || 'login.failed';
    return detail.map((d: { msg?: string }) => d?.msg).filter(Boolean).join(' ') || t(fb);
  }
  if (typeof e?.message === 'string' && e.message !== 'Network Error') return e.message;
  return t(keys?.fallbackKey || 'login.failed');
}
