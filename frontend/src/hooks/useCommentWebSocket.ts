import { useEffect, useRef, useCallback } from 'react';

export interface WsEvent {
  event: string;
  data: any;
}

function getWsBaseUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8000';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';

  const basePath = (window as any).BASE_PATH || '';
  if (basePath) {
    return `${proto}://${window.location.host}${basePath}`;
  }

  const raw = (import.meta as any).env?.VITE_API_URL;
  if (raw && raw !== '' && raw !== '/' && raw !== 'same') {
    const url = new URL(raw.replace(/\/api\/v1\/?$/, ''));
    const wsProto = url.protocol === 'https:' ? 'wss' : 'ws';
    return `${wsProto}://${url.host}`;
  }

  return `${proto}://${window.location.host}`;
}

export function useCommentWebSocket(
  tournamentId: number | null,
  onMessage: (event: WsEvent) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (!tournamentId) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const base = getWsBaseUrl();
    const url = `${base}/ws/tournaments/${tournamentId}/comments?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const parsed: WsEvent = JSON.parse(ev.data);
        onMessageRef.current(parsed);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [tournamentId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
