#!/usr/bin/env bash
set +e

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT:-$HOME/urai-final-receipts/aaa-launch-proof-$STAMP}"
mkdir -p "$OUT/screenshots"
LOG="$OUT/aaa-launch-proof.log"
BASE="${BASE:-https://urai.app}"

{
echo "===== AAA LAUNCH PROOF ====="
echo "STAMP=$STAMP"
echo "OUT=$OUT"
echo "BASE=$BASE"

git status --short
git log -5 --oneline --decorate

corepack enable || true
CI=true pnpm install --frozen-lockfile
INSTALL_EXIT=$?
echo "INSTALL_EXIT=$INSTALL_EXIT"

pnpm typecheck
TYPECHECK_EXIT=$?
echo "TYPECHECK_EXIT=$TYPECHECK_EXIT"

pnpm build:static
BUILD_EXIT=$?
echo "BUILD_EXIT=$BUILD_EXIT"

echo
echo "===== ASSET AUDIT ====="
echo "PUBLIC_ASSETS=$(find urai-tier1/public/assets -type f 2>/dev/null | wc -l)"
for f in \
  urai-tier1/public/assets/urai/launch/aaa-open-graph-launch.svg \
  urai-tier1/public/assets/urai/launch/quest-xr-proof-frame.svg \
  urai-tier1/public/assets/urai/launch/demo-replay-film-proof.svg \
  urai-tier1/src/app/aaa-launch-proof-layer.css
do
  test -f "$f" && echo "ASSET_OK $f" || echo "ASSET_MISSING $f"
done

if [ "$BUILD_EXIT" = "0" ]; then
  firebase deploy --config firebase.static.json --only hosting --project "${FIREBASE_PROJECT_ID:-urai-4dc1d}"
  DEPLOY_EXIT=$?
else
  DEPLOY_EXIT=1
fi
echo "DEPLOY_EXIT=$DEPLOY_EXIT"

echo
echo "===== LIVE ROUTE MATRIX ====="
BAD=0
for route in \
  / \
  /home \
  /ground \
  /life-map \
  /focus \
  /replay \
  /mirror \
  /passport \
  /status \
  /privacy-controls \
  /location-map \
  /spatial/ar-vr \
  /demo \
  /demo/replay-film \
  /assets/urai/launch/aaa-open-graph-launch.svg \
  /assets/urai/launch/quest-xr-proof-frame.svg \
  /assets/urai/launch/demo-replay-film-proof.svg
do
  CODE="$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE$route")"
  echo "$CODE $BASE$route"
  if [ "$CODE" != "200" ]; then BAD=$((BAD+1)); fi
done
echo "LIVE_BAD_COUNT=$BAD"

echo
echo "===== OPTIONAL SCREENSHOT AUDIT ====="
OUT="$OUT" BASE="$BASE" node <<'NODE'
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const { chromium } = require('playwright');
    const out = process.env.OUT;
    const base = process.env.BASE || 'https://urai.app';
    const browser = await chromium.launch({ headless: true });
    const routes = ['/', '/home', '/ground', '/life-map', '/focus', '/replay', '/mirror', '/passport', '/status', '/privacy-controls', '/location-map', '/spatial/ar-vr', '/demo', '/demo/replay-film'];

    for (const route of routes) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
      await page.goto(base + route, { waitUntil: 'networkidle', timeout: 45000 });
      const name = route === '/' ? 'root' : route.replaceAll('/', '_').replace(/^_/, '');
      await page.screenshot({ path: path.join(out, 'screenshots', `${name}.png`), fullPage: true });
      await page.close();
      console.log(`SCREENSHOT_OK ${route}`);
    }

    await browser.close();
    console.log('SCREENSHOT_RESULT=GREEN');
  } catch (error) {
    console.log('SCREENSHOT_RESULT=BLOCKED_OR_UNAVAILABLE');
    console.log(String(error.message || error));
  }
})();
NODE

echo
echo "===== FINAL ====="
if [ "$INSTALL_EXIT" = "0" ] && [ "$TYPECHECK_EXIT" = "0" ] && [ "$BUILD_EXIT" = "0" ] && [ "$DEPLOY_EXIT" = "0" ] && [ "$BAD" = "0" ]; then
  echo "RESULT=GREEN"
else
  echo "RESULT=RED"
fi

} 2>&1 | tee "$LOG"

echo "FINAL_LOG=$LOG"
echo "FINAL_OUT=$OUT"
