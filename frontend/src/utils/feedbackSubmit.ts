/** Automatischer Kontext wird an die Beschreibung angehängt (kein DB-Schema nötig). */

export interface FeedbackContextMeta {
  pageUrl: string;
  frontendVersion: string;
  backendVersion?: string;
  backendName?: string;
  userAgent: string;
}

export function buildFeedbackDescriptionWithContext(
  userBody: string,
  meta: FeedbackContextMeta
): string {
  const lines = [
    '',
    '--- Automatischer Kontext ---',
    `Seite/URL: ${meta.pageUrl}`,
    `Frontend-Version: ${meta.frontendVersion}`,
  ];
  if (meta.backendVersion) {
    lines.push(`API-Version: ${meta.backendVersion}`);
  }
  if (meta.backendName) {
    lines.push(`API-Name: ${meta.backendName}`);
  }
  lines.push(`User-Agent: ${meta.userAgent}`);
  return `${userBody.trimEnd()}${lines.join('\n')}`;
}
