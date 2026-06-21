#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE_URL="${URAI_AUDIT_BASE_URL:-https://urai.app}"
OUT_DIR="${URAI_AUDIT_OUT_DIR:-live-final-audit}"
LOG_DIR="logs"
LOG="$LOG_DIR/final-live-audit-$(date -u +%Y%m%dT%H%M%SZ).log"

mkdir -p "$LOG_DIR" "$OUT_DIR/screenshots"

exec > >(tee "$LOG") 2>&1

echo "=== URAI FINAL LIVE AUDIT ==="
echo "ROOT=$ROOT"
echo "BASE_URL=$BASE_URL"
echo "OUT_DIR=$OUT_DIR"
echo "LOG=$LOG"

echo
echo "=== ROUTE SMOKE ==="
routes=(/ /home /spatial /life-map /focus /replay /mirror /passport /status /privacy-controls)
for route in "${routes[@]}"; do
  code="$(curl -L -s -o /tmp/urai-audit-route.html -w "%{http_code}" "$BASE_URL$route?audit=$(date +%s)")"
  echo "$code $BASE_URL$route"
  if [[ "$code" != "200" ]]; then
    echo "FAILED_ROUTE=$route"
    exit 1
  fi
  safe_name="${route#/}"
  if [[ -z "$safe_name" ]]; then safe_name="root"; fi
  safe_name="${safe_name//\//_}"
  cp /tmp/urai-audit-route.html "$OUT_DIR/html-$safe_name.html"
done

echo
echo "=== STRICT LIVE TEXT GATES ==="
node scripts/final-live-text-gates.mjs

echo
echo "=== TEXT AUDIT GATES ==="
node scripts/final-live-screenshot-audit.mjs --text-only

echo
echo "=== BROWSER SCREENSHOT AUDIT ==="
SCREENSHOT_OK=1
if ! node scripts/final-live-screenshot-audit.mjs; then
  echo
  echo "SCREENSHOT_AUDIT_INITIAL_FAILED=1"
  echo "Trying to install the missing Playwright browser binary."
  if command -v pnpm >/dev/null 2>&1; then
    pnpm exec playwright install chromium || pnpm exec playwright install || true
  elif command -v npx >/dev/null 2>&1; then
    npx playwright install chromium || npx playwright install || true
  fi
  if ! node scripts/final-live-screenshot-audit.mjs; then
    SCREENSHOT_OK=0
    echo "SCREENSHOT_AUDIT_UNAVAILABLE=1"
  fi
fi

echo
echo "=== AUDIT SUMMARY ==="
cat "$OUT_DIR/audit-summary.md"

echo
echo "=== SCREENSHOTS ==="
find "$OUT_DIR/screenshots" -maxdepth 1 -type f -name '*.png' -print | sort || true

echo
echo "=== DONE ==="
echo "LOG=$LOG"
if [[ "$SCREENSHOT_OK" == "0" ]]; then
  echo "DONE_WITH_TEXT_AUDIT_BUT_SCREENSHOTS_UNAVAILABLE=1"
fi
