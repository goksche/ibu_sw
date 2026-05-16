#!/usr/bin/env bash
# Prueft .env.prod auf Server B: Pflichtkeys vorhanden und nicht leer (keine Werte ausgeben).
#
# Usage (auf Server B):
#   cd /opt/ibu_sw && ./scripts/check_env_drift_server_b.sh
#
# Optional: ENV_FILE=/opt/ibu_sw/.env.prod

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ibu_sw}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/.env.prod}"

REQUIRED_KEYS=(
  SECRET_KEY
  POSTGRES_PASSWORD
  POSTGRES_USER
  POSTGRES_DB
  DOMAIN_NAME
  CERTBOT_EMAIL
)

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "FAIL env-drift: ${ENV_FILE} fehlt" >&2
  exit 1
fi

echo "=== Env-Drift-Check (Server B) ==="
echo "file=${ENV_FILE}"
echo ""

missing=0
empty=0

for key in "${REQUIRED_KEYS[@]}"; do
  line="$(grep -E "^[[:space:]]*${key}=" "${ENV_FILE}" 2>/dev/null | tail -1 || true)"
  if [[ -z "${line}" ]]; then
    echo "  FEHLER: ${key} fehlt"
    missing=1
    continue
  fi
  val="${line#*=}"
  val="${val#\"}"
  val="${val%\"}"
  val="${val#\'}"
  val="${val%\'}"
  if [[ -z "${val}" ]] || [[ "${val}" == "changeme" ]] || [[ "${val}" == "changeme-change-me-in-production" ]]; then
    echo "  WARN: ${key} leer oder Platzhalter"
    empty=1
  else
    echo "  OK   ${key}"
  fi
done

echo ""
if [[ "${missing}" -ne 0 ]]; then
  echo "env-drift: FAIL (fehlende Keys)" >&2
  exit 1
fi
if [[ "${empty}" -ne 0 ]]; then
  echo "env-drift: WARN (Platzhalter — vor Produktion ersetzen)" >&2
  exit 2
fi
echo "env-drift: OK"
