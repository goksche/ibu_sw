#!/usr/bin/env bash
# v1.8.3 Gate — API-Contract + QA-Gate; manuelle Matrix: docs/MODES_TEST_MATRIX_SERVER_B.md
#
# Usage:
#   cd /opt/ibu_sw && ./scripts/run_modes_matrix_gate_server_b.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ibu_sw}"
cd "${APP_DIR}"

echo "=== Modi-Matrix Gate v1.8.3 ==="
echo ""

if [[ -f "${APP_DIR}/scripts/verify_api_contract.py" ]]; then
  python3 "${APP_DIR}/scripts/verify_api_contract.py"
  echo ""
else
  echo "FAIL verify_api_contract.py fehlt" >&2
  exit 1
fi

GATE_VERSION=1.8.3 EXPECTED_VERSION=1.8.3 "${APP_DIR}/scripts/run_qa_gate_server_b.sh"

echo ""
echo "Hinweis: Stufe A in docs/MODES_TEST_MATRIX_SERVER_B.md manuell im Browser (L/K/C)."
