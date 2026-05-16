// Footer Component - GSmartSol Copyright + API diagnostics (public)

import { useEffect, useState } from 'react';
import { infoService } from '../services/infoService';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [apiLabel, setApiLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    infoService
      .getDiagnostics()
      .then((data) => {
        if (cancelled) return;
        const label = data.deploy_label
          ? `API ${data.version} (${data.deploy_label})`
          : `API ${data.version}`;
        setApiLabel(label);
      })
      .catch(() => {
        if (!cancelled) setApiLabel(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer className="p-4 text-center text-sm text-muted-foreground border-t border-border bg-card mt-auto w-full">
      &copy; {currentYear}{' '}
      <span className="font-medium text-foreground">GSmartSol</span>
      . Alle Rechte vorbehalten.
      {apiLabel ? (
        <span className="block mt-1 text-xs text-muted-foreground" title="Öffentliche Diagnose (ohne Login)">
          {apiLabel}
        </span>
      ) : null}
    </footer>
  );
}
