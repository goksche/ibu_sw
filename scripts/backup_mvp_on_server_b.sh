#!/usr/bin/env bash
# Backup auf Server B — Projekt + PostgreSQL (read-only Quelle, schreibt nur nach /root/backup_mvp_*)
#
# Auf Server B:
#   cd /opt/ibu_sw && chmod +x scripts/backup_mvp_on_server_b.sh
#   ./scripts/backup_mvp_on_server_b.sh
#
# Optional: SOURCE_DIR=/opt/ibu_sw APP_DIR=/opt/ibu_sw

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ibu_sw}"
SOURCE_DIR="${SOURCE_DIR:-/opt/ibu_sw}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
TS="$(date +%Y%m%d_%H%M)"
BACKUP_ROOT="/root/backup_mvp_${TS}"
BACKUP_NAME="ibu_sw_backup_${TS}.tar"
PG_DUMP_NAME="pg_dump_${TS}.sql"
MANIFEST="${BACKUP_ROOT}/manifest.json"

echo "=== MVP-Backup auf Server B ==="
echo "Quelle:     ${SOURCE_DIR}"
echo "Compose:    ${APP_DIR}/${COMPOSE_FILE} (--env-file ${ENV_FILE})"
echo "Ziel:       ${BACKUP_ROOT}/"
echo ""

mkdir -p "${BACKUP_ROOT}"
cd "${APP_DIR}"

dc() {
  docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" "$@"
}

echo "Erstelle Projekt-Archiv..."
parent="$(dirname "${SOURCE_DIR}")"
base="$(basename "${SOURCE_DIR}")"
tar --exclude='node_modules' --exclude='__pycache__' --exclude='*.pyc' \
  --exclude='.git' --exclude='*.log' --exclude='backend/logs' \
  -C "${parent}" -cvf "${BACKUP_ROOT}/${BACKUP_NAME}" "${base}"

echo "Erstelle DB-Dump..."
dc exec -T postgres pg_dump -U "${POSTGRES_USER:-ibu_admin}" "${POSTGRES_DB:-ibu_turniere}" \
  > "${BACKUP_ROOT}/${PG_DUMP_NAME}"

for env_candidate in .env.prod .env; do
  if [[ -f "${APP_DIR}/${env_candidate}" ]]; then
    cp -a "${APP_DIR}/${env_candidate}" "${BACKUP_ROOT}/env.copy"
    break
  fi
done

sha_tar="$(sha256sum "${BACKUP_ROOT}/${BACKUP_NAME}" | awk '{print $1}')"
sha_sql="$(sha256sum "${BACKUP_ROOT}/${PG_DUMP_NAME}" | awk '{print $1}')"
cat > "${MANIFEST}" <<EOF
{
  "created_at": "$(date -Is)",
  "source_dir": "${SOURCE_DIR}",
  "app_dir": "${APP_DIR}",
  "tar": "${BACKUP_NAME}",
  "sql": "${PG_DUMP_NAME}",
  "sha256_tar": "${sha_tar}",
  "sha256_sql": "${sha_sql}"
}
EOF

echo ""
echo "=== Backup fertig: ${BACKUP_ROOT} ==="
ls -la "${BACKUP_ROOT}"
echo "Manifest: ${MANIFEST}"
