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
  text="$(python3 - <<'PY'
from html.parser import HTMLParser
from pathlib import Path
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.out=[]; self.skip=False
    def handle_starttag(self, tag, attrs):
        if tag in {'script','style','noscript'}: self.skip=True
        if tag in {'h1','h2','h3','p','a','li','button'}: self.out.append('\n')
    def handle_endtag(self, tag):
        if tag in {'script','style','noscript'}: self.skip=False
    def handle_data(self, data):
        if not self.skip:
            s=' '.join(data.split())
            if s: self.out.append(s)
p=P(); p.feed(Path('/tmp/urai-audit-route.html').read_text(errors='ignore'))
print(' '.join(p.out)[:1200])
PY
)"
  printf '%s\n\n' "$text" > "$OUT_DIR/text-${route//\//_}.txt"
done

echo
echo "=== TEXT AUDIT GATES ==="
node scripts/final-live-screenshot-audit.mjs --text-only || true

echo
echo "=== BROWSER SCREENSHOT AUDIT ==="
if ! node scripts/final-live-screenshot-audit.mjs; then
  echo
  echo "SCREENSHOT_AUDIT_INITIAL_FAILED=1"
  echo "Trying to install the missing Playwright browser binary."
  if command -v npx >/dev/null 2>&1; then
    npx playwright install chromium || npx playwright install || true
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm exec playwright install chromium || pnpm exec playwright install || true
  fi
  node scripts/final-live-screenshot-audit.mjs
fi

echo
echo "=== AUDIT SUMMARY ==="
cat "$OUT_DIR/audit-summary.md"

echo
echo "=== SCREENSHOTS ==="
find "$OUT_DIR/screenshots" -maxdepth 1 -type f -name '*.png' -print | sort

echo
echo "=== DONE ==="
echo "LOG=$LOG"
