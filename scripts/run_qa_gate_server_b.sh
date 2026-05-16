#!/usr/bin/env bash
# QA Gate — Server B (read-only, kein Deploy/Restart/DB-Schreiben)
#
# Usage:
#   cd /opt/ibu_sw && ./scripts/run_qa_gate_server_b.sh
#   VERIFY_BACKUP=1 ./scripts/run_qa_gate_server_b.sh
#   BASE_URL=https://betabilic.finalstage.ch ./scripts/run_qa_gate_server_b.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ibu_sw}"
BASE_URL="${BASE_URL:-https://test.finalstage.ch}"
BASE_URL="${BASE_URL%/}"
RELEASE_DIR="${QA_GATE_LOG_DIR:-/root/releases/qa_gate}"
EXPECTED_VERSION="${EXPECTED_VERSION:-1.8.1}"
GATE_VERSION="${GATE_VERSION:-1.8.1}"

mkdir -p "${RELEASE_DIR}"
TS="$(date +%Y%m%d_%H%M%S)"
LOG="${RELEASE_DIR}/qa_gate_${TS}.log"

exec > >(tee -a "${LOG}") 2>&1

echo "=== QA Gate v${GATE_VERSION} (Server B) ==="
echo "timestamp=$(date -Is)"
echo "app_dir=${APP_DIR}"
echo "base_url=${BASE_URL}"
echo "log=${LOG}"
echo ""

# --- 1) Public smoke (HTTPS) ---
if [[ ! -x "${APP_DIR}/scripts/smoke_server_b.sh" ]]; then
  echo "FAIL smoke_server_b.sh fehlt oder nicht ausfuehrbar: ${APP_DIR}/scripts/smoke_server_b.sh" >&2
  exit 1
fi
BASE_URL="${BASE_URL}" "${APP_DIR}/scripts/smoke_server_b.sh"
echo ""

# --- 2) Docker stack (read-only) ---
cd "${APP_DIR}"
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

nginx_line="$(docker compose --env-file .env.prod -f docker-compose.prod.yml ps nginx --format '{{.Status}}' 2>/dev/null || true)"
if echo "${nginx_line}" | grep -qi 'restarting'; then
  echo "FAIL nginx im Restart-Loop: ${nginx_line}" >&2
  exit 1
fi
echo "OK  nginx                       ${nginx_line:-unknown}"
echo ""

# --- 3) Backend version + diagnostics (Container, read-only) ---
version_json="$(docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/info/version', timeout=15).read().decode())" 2>/dev/null || true)"
if [[ -z "${version_json}" ]]; then
  echo "FAIL backend /api/v1/info/version (intern)" >&2
  exit 1
fi
echo "OK  backend-version             ${version_json}"

diag_json="$(docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T backend \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/v1/info/diagnostics', timeout=15).read().decode())" 2>/dev/null || true)"
if [[ -z "${diag_json}" ]]; then
  echo "FAIL backend /api/v1/info/diagnostics (intern)" >&2
  exit 1
fi
echo "OK  backend-diagnostics         ${diag_json}"

if ! echo "${version_json}" | grep -q "\"version\"[[:space:]]*:[[:space:]]*\"${EXPECTED_VERSION}\""; then
  echo "WARN erwartete Version ${EXPECTED_VERSION} — pruefen (kein harter Abbruch)" >&2
fi
echo ""

# --- 4) Postgres erreichbar (read-only) ---
pg_ok="$(docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T postgres \
  psql -U ibu_admin -d ibu_turniere -tAc 'SELECT 1' 2>/dev/null || true)"
if [[ "${pg_ok}" != "1" ]]; then
  echo "FAIL postgres SELECT 1" >&2
  exit 1
fi
echo "OK  postgres                    SELECT 1"
echo ""

# --- 5) Optional: neuestes MVP-Backup pruefen ---
if [[ "${VERIFY_BACKUP:-}" == "1" ]]; then
  if [[ -x "${APP_DIR}/scripts/verify_backup_server_b.sh" ]]; then
    "${APP_DIR}/scripts/verify_backup_server_b.sh"
  else
    echo "WARN verify_backup_server_b.sh nicht ausfuehrbar — uebersprungen" >&2
  fi
  echo ""
fi

ln -sf "${LOG}" "${RELEASE_DIR}/qa_gate_latest.log"
echo "QA Gate v${GATE_VERSION} OK"
echo "latest_log=${RELEASE_DIR}/qa_gate_latest.log"
