#!/usr/bin/env bash
# Smoke-Test gegen den Ã¶ffentlichen Host von Server B (Standard: test.finalstage.ch).
# Keine DB-Zugriffe. Nutzt nur HTTPS und Ã¶ffentliche/leicht erreichbare Endpunkte.
#
# Usage:
#   chmod +x scripts/smoke_server_b.sh
#   ./scripts/smoke_server_b.sh
#   BASE_URL=https://betabilic.finalstage.ch ./scripts/smoke_server_b.sh

set -euo pipefail

BASE_URL="${BASE_URL:-https://test.finalstage.ch}"
BASE_URL="${BASE_URL%/}"

curl_bin="$(command -v curl)"
if [[ -z "${curl_bin}" ]]; then
  echo "smoke_server_b: curl nicht gefunden" >&2
  exit 1
fi

check_http() {
  local name="$1"
  local url="$2"
  shift 2
  local ok_codes=( "$@" )

  local code
  code="$("${curl_bin}" -sS -o /dev/null -w "%{http_code}" --max-time 20 \
    -H "Accept: application/json, text/html, */*" \
    "${url}")" || true

  local c
  for c in "${ok_codes[@]}"; do
    if [[ "${code}" == "${c}" ]]; then
      printf 'OK  %-28s %s %s\n' "${name}" "${code}" "${url}"
      return 0
    fi
  done
  printf 'FAIL %-28s HTTP %s (erwartet: %s) %s\n' "${name}" "${code}" "${ok_codes[*]}" "${url}" >&2
  return 1
}

echo ""
echo "=== Server-B Smoke (BASE_URL=${BASE_URL}) ==="
echo ""

failed=0

# Startseite (Landing oder SPA je nach Nginx)
check_http "home" "${BASE_URL}/" 200 || failed=1

# Ã–ffentliche API (ohne Token)
check_http "api-info-version" "${BASE_URL}/api/v1/info/version" 200 || failed=1

# Optional: nicht überall hinter Nginx erreichbar
check_http "api-info-diagnostics" "${BASE_URL}/api/v1/info/diagnostics" 200 || failed=1

echo ""

if [[ "${failed}" -ne 0 ]]; then
  echo "Smoke FEHLGESCHLAGEN." >&2
  exit 1
fi

echo "Smoke OK."
