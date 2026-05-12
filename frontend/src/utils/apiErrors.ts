/** Gemeinsame Auswertung von Axios-/API-Fehlern (422/4xx/5xx/Netzwerk). */

export function normalizeKnownBackendMessages(msg: string): string {
  if (
    msg.includes('league_scoring_system') &&
    msg.includes("Input should be 'points' or 'difference'")
  ) {
    return "Backend-Stand ist veraltet und unterstuetzt 'Siege' noch nicht. Bitte Backend neu starten/neu deployen.";
  }
  return msg;
}

export function formatApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as {
    formattedApiMessage?: string;
    response?: { status?: number; data?: Record<string, unknown> };
    message?: string;
    code?: string;
  };

  if (typeof e?.formattedApiMessage === 'string' && e.formattedApiMessage.trim()) {
    return e.formattedApiMessage.trim();
  }

  const status = e?.response?.status;
  const data = e?.response?.data;

  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return normalizeKnownBackendMessages(detail.trim());
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const parts: string[] = [];
    for (const entry of detail) {
      if (typeof entry === 'string') {
        parts.push(normalizeKnownBackendMessages(entry));
        continue;
      }
      if (entry && typeof entry === 'object') {
        const loc = Array.isArray((entry as { loc?: unknown }).loc)
          ? (entry as { loc: unknown[] }).loc.join(' > ')
          : '';
        const msg =
          typeof (entry as { msg?: string }).msg === 'string'
            ? (entry as { msg: string }).msg
            : 'Ungueltige Eingabe';
        parts.push(normalizeKnownBackendMessages(loc ? `${loc}: ${msg}` : msg));
      }
    }
    if (parts.length) return parts.join(' | ');
  }

  if (detail && typeof detail === 'object') {
    if (typeof (detail as { message?: string }).message === 'string') {
      return (detail as { message: string }).message;
    }
    return 'Ungueltige Anfrage';
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  if (typeof data?.error === 'string' && data.error.trim() && status) {
    const prefix =
      status === 422 ? 'Validierung' : status >= 500 ? 'Serverfehler' : 'Fehler';
    return `${prefix} (HTTP ${status}): ${data.error}`;
  }

  if (!e?.response) {
    if (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED') {
      return 'Netzwerkfehler — bitte Verbindung prüfen und erneut versuchen.';
    }
    if (typeof e?.message === 'string' && e.message.trim()) return e.message.trim();
    return fallback;
  }

  if (status === 422) {
    return 'Eingaben konnten nicht verarbeitet werden (HTTP 422).';
  }
  if (status && status >= 500) {
    return `Serverfehler (HTTP ${status}). Bitte später erneut versuchen oder Support informieren.`;
  }

  if (typeof e?.message === 'string' && e.message.trim()) return e.message.trim();
  return fallback;
}

export function isWinsUnsupportedError(err: unknown): boolean {
  const e = err as { response?: { data?: { detail?: unknown } } };
  const detail = e?.response?.data?.detail;
  const text =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail
            .map((d: unknown) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg || ''))
            .join(' ')
        : '';
  return text.includes("Input should be 'points' or 'difference'");
}
