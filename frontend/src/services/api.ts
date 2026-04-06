// API Client - Axios Configuration
import axios from 'axios';

// BASE_PATH für Plattform-Integration
// Extrahiert BASE_PATH aus window.BASE_PATH oder aus der URL
function getBasePath(): string {
  // Prüfe ob BASE_PATH bereits gesetzt ist (wird von der Plattform gesetzt)
  if (typeof window !== 'undefined' && (window as any).BASE_PATH) {
    return (window as any).BASE_PATH;
  }
  
  // Fallback: Extrahiere aus URL (z.B. /App-4/...)
  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/');
    if (parts.length > 1 && parts[1].startsWith('App-')) {
      return '/' + parts[1];
    }
  }
  
  // Lokale Entwicklung ohne Prefix
  return '';
}

// BASE_PATH für API-Requests
const BASE_PATH = getBasePath();

/**
 * In DEV immer gleiche Origin (/api/v1), damit der Vite-Proxy greift und kein direkter
 * Aufruf an :8000 nötig ist (vermeidet „Login fehlgeschlagen“ ohne erkennbaren Grund).
 * Opt-out: VITE_DEV_DIRECT_API=true in .env
 */
const devUseProxy =
  import.meta.env.DEV && import.meta.env.VITE_DEV_DIRECT_API !== 'true';

// Relativ (gleiche Origin) wenn leer, "/" oder "same" – sonst absolute API-Origin
const raw = import.meta.env.VITE_API_URL;
const envUrl =
  raw === '' || raw === '/' || raw === 'same' ? '' : (raw || 'http://localhost:8000');

let API_URL = envUrl.replace(/\/api\/v1\/?$/, '');
// Fehlerfall: VITE_API_URL war z. B. "https://api/v1" → nach Strip nur "https:" → sonst Host "api" (ERR_NAME_NOT_RESOLVED)
if (API_URL === 'https:' || API_URL === 'http:') {
  API_URL = '';
}

/**
 * Server B (Plan mvp-erweiterung-1…): test.finalstage.ch → API wie im Runbook unter
 * gleicher Origin /api/v1 (vgl. curl-Check Host test.finalstage.ch). Sonst kann ein
 * falsch eingebackenes VITE_API_URL zu https://api/v1/… (ERR_NAME_NOT_RESOLVED) führen.
 */
function useServerBSameOriginApi(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'test.finalstage.ch';
}

// Bestimme die baseURL:
// - Plattform mit BASE_PATH → unter Präfix
// - DEV (Standard) → /api/v1 (Vite-Proxy + Fallback)
// - Server B (test.finalstage.ch) → /api/v1 (Nginx → Backend, Plan-Runbook)
// - Sonst → VITE_API_URL + /api/v1, oder nur /api/v1 (gleiche Origin hinter Nginx)
const baseURL = BASE_PATH
  ? `${BASE_PATH}/api/v1`
  : devUseProxy
  ? '/api/v1'
  : useServerBSameOriginApi()
  ? '/api/v1'
  : API_URL
  ? `${API_URL}/api/v1`
  : '/api/v1';

// Create Axios instance
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token and language to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const lang = localStorage.getItem('i18nextLng') || 'de';
  config.headers['Accept-Language'] = lang;
  // FormData: Default application/json entfernen, sonst fehlt die multipart-Boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete (config.headers as Record<string, unknown>)['Content-Type'];
  }
  return config;
});

// Response interceptor for error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

