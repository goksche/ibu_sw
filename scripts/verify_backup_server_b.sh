#!/usr/bin/env bash
# Prueft das neueste /root/backup_mvp_* (nur Dateien, keine DB-Aenderung).
# Exit 0 wenn Backup plausibel, 1 wenn fehlend oder leer.
#
# Optional: VERIFY_BACKUP_DIR=/root/backup_mvp_YYYYMMDD_HHMM

set -euo pipefail

LATEST="${VERIFY_BACKUP_DIR:-$(ls -dt /root/backup_mvp_* 2>/dev/null | head -1 || true)}"if [[ -z "${LATEST}" ]]; then
  echo "verify_backup: Kein Verzeichnis /root/backup_mvp_* gefunden."
  echo "Hinweis: Zuerst scripts/backup_mvp_on_server_b.sh ausfÃ¼hren."
  exit 1
fi

TAR="$(find "$LATEST" -maxdepth 1 -name 'ibu_sw_backup_*.tar' -print -quit)"
SQL="$(find "$LATEST" -maxdepth 1 -name 'pg_dump_*.sql' -print -quit)"

echo "verify_backup: prÃ¼fe $LATEST"
err=0
if [[ -z "$TAR" ]] || [[ ! -s "$TAR" ]]; then
  echo "  FEHLER: ibu_sw_backup_*.tar fehlt oder leer."
  err=1
else
  echo "  OK tar: $TAR ($(stat -c%s "$TAR" 2>/dev/null || echo '?') bytes)"
fi
if [[ -z "$SQL" ]] || [[ ! -s "$SQL" ]]; then
  echo "  FEHLER: pg_dump_*.sql fehlt oder leer."
  err=1
else
  echo "  OK sql: $SQL ($(stat -c%s "$SQL" 2>/dev/null || echo '?') bytes)"
fi

MANIFEST="${LATEST}/manifest.json"
if [[ -f "$MANIFEST" ]]; then
  echo "  OK manifest: $MANIFEST"
else
  echo "  HINWEIS: manifest.json fehlt (aelteres Backup)."
fi

if [[ "$err" -ne 0 ]]; then
  exit 1
fi
echo "verify_backup: OK."