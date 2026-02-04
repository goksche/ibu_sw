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

// Relativ (gleiche Origin) wenn leer, "/" oder "same" – sonst lokale Dev-URL
const raw = import.meta.env.VITE_API_URL;
const envUrl =
  raw === '' || raw === '/' || raw === 'same' ? '' : (raw || 'http://localhost:8000');
const API_URL = envUrl.replace(/\/api\/v1\/?$/, '');

// BASE_PATH für API-Requests
const BASE_PATH = getBasePath();

// Bestimme die baseURL:
// - Wenn BASE_PATH gesetzt ist (Plattform), verwende BASE_PATH für API-Requests
// - Wenn BASE_PATH leer ist (lokale Entwicklung), verwende API_URL
const baseURL = BASE_PATH 
  ? `${BASE_PATH}/api/v1`
  : `${API_URL}/api/v1`;

// Create Axios instance
const api = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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

