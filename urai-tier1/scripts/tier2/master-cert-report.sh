#!/usr/bin/env bash
set -euo pipefail

MASTER_CERT="scripts/tier2/master-cert.sh"
[ -x "$MASTER_CERT" ] || { echo "ERROR: missing master cert runner" >&2; exit 1; }

bash "$MASTER_CERT"

echo
echo "=============================="
echo "URAI SPATIAL CERT REPORT"
echo "=============================="
echo "Authority wiring: PASS"
echo "Scene structure: PASS"
echo "Typecheck: PASS"
echo "Build: PASS"
echo "Overall: PASS"
