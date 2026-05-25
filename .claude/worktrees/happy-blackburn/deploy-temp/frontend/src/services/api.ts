// API Client - Axios Configuration
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// #region agent log
const apiConfig = {apiUrl:API_URL,baseURL:`${API_URL}/api/v1`,hasEnvVar:!!import.meta.env.VITE_API_URL};
console.log('[DEBUG] API URL config:', apiConfig);
fetch('http://127.0.0.1:7242/ingest/37a2199e-e139-4caa-bc6d-01e215fbd275',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:4',message:'API URL config',data:apiConfig,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
// #endregion

// Create Axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  // #region agent log
  const requestData = {url:config?.url,baseURL:config?.baseURL,hasToken:!!token,tokenLength:token?.length};
  if (config?.url?.includes('templates')) {
    console.log('[DEBUG] Request interceptor for templates:', requestData);
  }
  fetch('http://127.0.0.1:7242/ingest/37a2199e-e139-4caa-bc6d-01e215fbd275',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:15',message:'Request interceptor',data:requestData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error logging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // #region agent log
    const errorData = {url:error?.config?.url,baseURL:error?.config?.baseURL,status:error?.response?.status,statusText:error?.response?.statusText,message:error?.message,code:error?.code,isAxiosError:error?.isAxiosError,responseData:error?.response?.data};
    // Debug-Log als Warnung, nicht als Fehler
    console.warn('[DEBUG] API Response error interceptor:', errorData);
    fetch('http://127.0.0.1:7242/ingest/37a2199e-e139-4caa-bc6d-01e215fbd275',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api.ts:28',message:'Response error interceptor',data:errorData,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'ALL'})}).catch(()=>{});
    // #endregion
    return Promise.reject(error);
  }
);

export default api;

