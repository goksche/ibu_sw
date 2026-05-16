#!/usr/bin/env bash
# Wiederherstellung aus /root/backup_mvp_* — NUR mit expliziter Bestätigung.
#
# Dry-run (Standard):
#   ./scripts/restore_server_b_from_mvp_backup.sh /root/backup_mvp_YYYYMMDD_HHMM
#
# Echte Wiederherstellung (überschreibt /opt/ibu_sw + DB — nur nach Absprache):
#   CONFIRM_RESTORE=yes ./scripts/restore_server_b_from_mvp_backup.sh /root/backup_mvp_YYYYMMDD_HHMM
#
# DB-Inhalt wird ersetzt. Vorher eigenes Backup anlegen (backup_mvp_on_server_b.sh).

set -euo pipefail

BACKUP_DIR="${1:-}"
APP_DIR="${APP_DIR:-/opt/ibu_sw}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
CONFIRM="${CONFIRM_RESTORE:-}"

if [[ -z "${BACKUP_DIR}" ]] || [[ ! -d "${BACKUP_DIR}" ]]; then
  echo "Usage: $0 /root/backup_mvp_YYYYMMDD_HHMM" >&2
  echo "Neuestes Backup:" >&2
  ls -dt /root/backup_mvp_* 2>/dev/null | head -3 || true
  exit 1
fi

TAR="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'ibu_sw_backup_*.tar' -print -quit)"
SQL="$(find "${BACKUP_DIR}" -maxdepth 1 -name 'pg_dump_*.sql' -print -quit)"

if [[ -z "${TAR}" ]] || [[ ! -s "${TAR}" ]]; then
  echo "FEHLER: ibu_sw_backup_*.tar fehlt in ${BACKUP_DIR}" >&2
  exit 1
fi
if [[ -z "${SQL}" ]] || [[ ! -s "${SQL}" ]]; then
  echo "FEHLER: pg_dump_*.sql fehlt in ${BACKUP_DIR}" >&2
  exit 1
fi

echo "=== Restore-Plan (Server B) ==="
echo "Backup:  ${BACKUP_DIR}"
echo "Tar:     ${TAR}"
echo "SQL:     ${SQL}"
echo "Ziel:    ${APP_DIR}"
echo ""

if [[ "${CONFIRM}" != "yes" ]]; then
  echo "DRY-RUN — keine Änderungen."
  echo "Tar-Inhalt (erste 20 Einträge):"
  tar -tf "${TAR}" | head -20
  echo "..."
  echo "SQL-Zeilen: $(wc -l < "${SQL}")"
  echo ""
  echo "Echte Wiederherstellung:"
  echo "  CONFIRM_RESTORE=yes $0 ${BACKUP_DIR}"
  exit 0
fi

echo "WARNUNG: Starte Wiederherstellung in 5s (Strg+C zum Abbrechen)..."
sleep 5

cd "${APP_DIR}"
dc() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

echo "Stoppe App-Container (postgres läuft weiter)..."
dc stop frontend backend nginx 2>/dev/null || true

STAGING="/tmp/ibu_restore_$$"
mkdir -p "${STAGING}"
tar -xf "${TAR}" -C "${STAGING}"

RESTORE_SRC="$(find "${STAGING}" -maxdepth 2 -type d -name 'ibu_sw' -print -quit)"
if [[ -z "${RESTORE_SRC}" ]]; then
  RESTORE_SRC="${STAGING}"
fi

echo "Synchronisiere Dateien nach ${APP_DIR} (ohne .env.prod zu überschreiben)..."
rsync -a --delete \
  --exclude='.env.prod' \
  --exclude='node_modules' \
  "${RESTORE_SRC}/" "${APP_DIR}/"

if [[ -f "${BACKUP_DIR}/env.copy" ]]; then
  echo "Hinweis: env.copy liegt in Backup — .env.prod wurde NICHT überschrieben."
fi

echo "Stelle Datenbank wieder her..."
dc exec -T postgres psql -U "${POSTGRES_USER:-ibu_admin}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB:-ibu_turniere}' AND pid <> pg_backend_pid();" \
  2>/dev/null || true
dc exec -T postgres psql -U "${POSTGRES_USER:-ibu_admin}" -d postgres -c \
  "DROP DATABASE IF EXISTS ${POSTGRES_DB:-ibu_turniere};"
dc exec -T postgres psql -U "${POSTGRES_USER:-ibu_admin}" -d postgres -c \
  "CREATE DATABASE ${POSTGRES_DB:-ibu_turniere};"
dc exec -T postgres psql -U "${POSTGRES_USER:-ibu_admin}" -d "${POSTGRES_DB:-ibu_turniere}" < "${SQL}"

echo "Starte Stack..."
dc up -d

rm -rf "${STAGING}"
echo "=== Restore abgeschlossen. Bitte ./scripts/run_qa_gate_server_b.sh ausführen. ==="
