#!/usr/bin/env bash
# v1.8.4 Gate — KO-Auslosungsarten Contract + QA-Gate
#
# Usage:
#   cd /opt/ibu_sw && ./scripts/run_draw_methods_matrix_gate_server_b.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ibu_sw}"
cd "${APP_DIR}"

echo "=== KO-Auslosungsarten Gate v1.8.4 ==="
echo ""

for script in verify_api_contract.py verify_draw_methods_matrix.py; do
  if [[ -f "${APP_DIR}/scripts/${script}" ]]; then
    python3 "${APP_DIR}/scripts/${script}"
    echo ""
  else
    echo "FAIL scripts/${script} fehlt" >&2
    exit 1
  fi
done

GATE_VERSION=1.8.4 EXPECTED_VERSION=1.8.4 "${APP_DIR}/scripts/run_qa_gate_server_b.sh"

echo ""
echo "Hinweis: Stufe A in docs/DRAW_METHODS_TEST_MATRIX_SERVER_B.md manuell im Browser."
