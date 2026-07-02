#!/usr/bin/env bash
set +e

# URAI V1 AUTOPILOT
# One command runs the remaining mechanical work for Ground, Focus, Replay,
# mobile safety, and the final V1 review package.
# It does not silently convert machine proof into a human AAA taste claim.

BASE_URL="${BASE_URL:-https://urai.app}"
FIREBASE_PROJECT="${FIREBASE_PROJECT_ID:-urai-4dc1d}"
MAX_DEPLOY_ATTEMPTS="${MAX_DEPLOY_ATTEMPTS:-6}"
MAX_SCREENSHOT_ATTEMPTS="${MAX_SCREENSHOT_ATTEMPTS:-3}"
EXPECTED_PNG_COUNT="${EXPECTED_PNG_COUNT:-24}"
COMMIT_RECEIPT="${COMMIT_RECEIPT:-1}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ -d "$HOME/urai-spatial/.git" ]; then
  cd "$HOME/urai-spatial"
elif [ -d "$HOME/urai-work/urai-spatial/.git" ]; then
  cd "$HOME/urai-work/urai-spatial"
else
  echo "Could not find urai-spatial repo."
  exit 1
fi

OUT="$HOME/urai-final-receipts/v1-autopilot-$STAMP"
mkdir -p "$OUT"
exec > >(tee "$OUT/run.log") 2>&1
: > "$OUT/summary.txt"

summary() { echo "$1" | tee -a "$OUT/summary.txt"; }

proof_from_log() {
  grep -E '^Receipt: ' "$1" 2>/dev/null | tail -1 | sed 's/^Receipt: //'
}

count_pngs() {
  if [ -n "$1" ] && [ -d "$1/screenshots" ]; then
    find "$1/screenshots" -maxdepth 1 -name '*.png' | wc -l | tr -d ' '
  else
    echo 0
  fi
}

echo "# URAI V1 AUTOPILOT"
echo "OUT=$OUT"
echo "BASE_URL=$BASE_URL"
echo "FIREBASE_PROJECT=$FIREBASE_PROJECT"
echo

if [ -n "$(git status --porcelain)" ]; then
  echo "STOP: working tree is not clean. Commit or stash local changes first."
  git status --short
  exit 1
fi

echo "=== SYNC AUTOPILOT SOURCE ==="
git pull --ff-only origin main 2>&1 | tee "$OUT/git-pull.log"
SYNC_EXIT=${PIPESTATUS[0]}
summary "SYNC_EXIT=$SYNC_EXIT"
[ "$SYNC_EXIT" = "0" ] || exit 1
HEAD_SHORT="$(git rev-parse --short HEAD)"
summary "HEAD_SHORT=$HEAD_SHORT"

echo
echo "=== ASSET WALL AUDIT ==="
node scripts/audit-v123-asset-wall.mjs 2>&1 | tee "$OUT/asset-wall.log"
AUDIT_EXIT=${PIPESTATUS[0]}
summary "AUDIT_EXIT=$AUDIT_EXIT"

echo
echo "=== TYPECHECK ==="
pnpm typecheck 2>&1 | tee "$OUT/typecheck.log"
TYPECHECK_EXIT=${PIPESTATUS[0]}
summary "TYPECHECK_EXIT=$TYPECHECK_EXIT"
[ "$TYPECHECK_EXIT" = "0" ] || exit 1

echo
echo "=== STATIC BUILD ==="
pnpm build:static 2>&1 | tee "$OUT/build.log"
BUILD_EXIT=${PIPESTATUS[0]}
summary "BUILD_EXIT=$BUILD_EXIT"
[ "$BUILD_EXIT" = "0" ] || exit 1

echo
echo "=== FIREBASE DEPLOY WITH RECOVERY ==="
DEPLOY_EXIT=1
ATTEMPT=1
while [ "$ATTEMPT" -le "$MAX_DEPLOY_ATTEMPTS" ]; do
  firebase deploy --config firebase.static.json --only hosting --project "$FIREBASE_PROJECT" --non-interactive 2>&1 | tee "$OUT/deploy-$ATTEMPT.log"
  DEPLOY_EXIT=${PIPESTATUS[0]}
  summary "DEPLOY_EXIT_ATTEMPT_$ATTEMPT=$DEPLOY_EXIT"
  [ "$DEPLOY_EXIT" = "0" ] && break
  rm -rf "$HOME/.cache/firebase" 2>/dev/null
  sleep 20
  ATTEMPT=$((ATTEMPT+1))
done
summary "DEPLOY_EXIT=$DEPLOY_EXIT"
[ "$DEPLOY_EXIT" = "0" ] || exit 1

echo
echo "=== LIVE ROUTES ==="
ROUTE_EXIT=0
CACHE_BUST="$(date +%s)"
for route in \
  "/home" "/ground" "/life-map" "/focus?memoryId=quiet-reset" \
  "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread" \
  "/mirror" "/passport" "/status" "/privacy-controls" "/location-map" \
  "/spatial/ar-vr" "/demo/replay-film"
do
  separator="?"
  [[ "$route" == *"?"* ]] && separator="&"
  code="$(curl -s -o /dev/null -w '%{http_code}' -L "$BASE_URL$route${separator}autopilot=$CACHE_BUST")"
  echo "$code $BASE_URL$route" | tee -a "$OUT/live-routes.txt"
  [ "$code" = "200" ] || ROUTE_EXIT=1
done
summary "ROUTE_EXIT=$ROUTE_EXIT"
[ "$ROUTE_EXIT" = "0" ] || exit 1

echo
echo "=== PLAYWRIGHT ENSURE AFTER BUILD ==="
pnpm playwright:ensure 2>&1 | tee "$OUT/playwright-ensure.log"
PW_EXIT=${PIPESTATUS[0]}
if [ "$PW_EXIT" != "0" ]; then
  pnpm exec playwright install chromium 2>&1 | tee "$OUT/playwright-install.log"
  PW_EXIT=${PIPESTATUS[0]}
fi
summary "PW_EXIT=$PW_EXIT"
[ "$PW_EXIT" = "0" ] || exit 1

echo
echo "=== SCREENSHOT CAPTURE WITH AUTOMATIC RETRY ==="
PNG_COUNT=0
PROOF_EXIT=1
LATEST_PROOF=""
SHOT_ATTEMPT=1
while [ "$SHOT_ATTEMPT" -le "$MAX_SCREENSHOT_ATTEMPTS" ]; do
  SHOT_LOG="$OUT/screenshots-$SHOT_ATTEMPT.log"
  node scripts/aaa-launch-proof.mjs \
    --skip-install --skip-typecheck --skip-test --skip-build \
    --screenshots --base="$BASE_URL" 2>&1 | tee "$SHOT_LOG"
  PROOF_EXIT=${PIPESTATUS[0]}
  LATEST_PROOF="$(proof_from_log "$SHOT_LOG")"
  if [ -z "$LATEST_PROOF" ] || [ ! -d "$LATEST_PROOF" ]; then
    LATEST_PROOF="$(ls -td "$HOME"/urai-final-receipts/aaa-launch-proof-* 2>/dev/null | head -1)"
  fi
  PNG_COUNT="$(count_pngs "$LATEST_PROOF")"
  summary "PROOF_EXIT_ATTEMPT_$SHOT_ATTEMPT=$PROOF_EXIT"
  summary "PNG_COUNT_ATTEMPT_$SHOT_ATTEMPT=$PNG_COUNT"
  if [ "$PROOF_EXIT" = "0" ] && [ "$PNG_COUNT" = "$EXPECTED_PNG_COUNT" ]; then
    break
  fi
  pnpm exec playwright install chromium 2>&1 | tee "$OUT/playwright-repair-$SHOT_ATTEMPT.log"
  sleep 4
  SHOT_ATTEMPT=$((SHOT_ATTEMPT+1))
done
summary "PROOF_EXIT=$PROOF_EXIT"
summary "PNG_COUNT=$PNG_COUNT"
summary "LATEST_PROOF=$LATEST_PROOF"
[ "$PROOF_EXIT" = "0" ] || exit 2
[ "$PNG_COUNT" = "$EXPECTED_PNG_COUNT" ] || exit 2

echo
echo "=== MACHINE IMAGE GATE ==="
LOOP_NAME="v1-autopilot" EXPECTED_PNG_COUNT="$EXPECTED_PNG_COUNT" PROOF_DIR="$LATEST_PROOF" \
  python3 scripts/urai-machine-visual-verdict.py 2>&1 | tee "$OUT/machine-visual.log"
VISUAL_EXIT=${PIPESTATUS[0]}
summary "VISUAL_EXIT=$VISUAL_EXIT"
[ "$VISUAL_EXIT" = "0" ] || exit 3

echo
echo "=== ROUTE-SPECIFIC STRUCTURAL GATE ==="
LOOP_NAME="v1-autopilot" BASE_URL="$BASE_URL" \
  node scripts/urai-v1-structural-audit.mjs 2>&1 | tee "$OUT/structural-audit.log"
STRUCTURAL_EXIT=${PIPESTATUS[0]}
summary "STRUCTURAL_EXIT=$STRUCTURAL_EXIT"
[ "$STRUCTURAL_EXIT" = "0" ] || exit 4

echo
echo "=== PACKAGE ONE FINAL REVIEW ZIP ==="
ZIP="$OUT/urai-v1-autopilot-review-$HEAD_SHORT-$STAMP.zip"
cd "$LATEST_PROOF" || exit 1
zip -r "$ZIP" screenshots screenshots.json final-report.md route-matrix.md route-matrix.json summary.json 2>&1 | tee "$OUT/zip.log"
cd - >/dev/null || exit 1
summary "ZIP=$ZIP"

cat > "$OUT/v1-autopilot-receipt.md" <<EOF
# URAI V1 Autopilot Receipt

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Head: $HEAD_SHORT
Base: $BASE_URL

- AUDIT_EXIT=$AUDIT_EXIT
- TYPECHECK_EXIT=$TYPECHECK_EXIT
- BUILD_EXIT=$BUILD_EXIT
- DEPLOY_EXIT=$DEPLOY_EXIT
- ROUTE_EXIT=$ROUTE_EXIT
- PW_EXIT=$PW_EXIT
- PROOF_EXIT=$PROOF_EXIT
- PNG_COUNT=$PNG_COUNT
- VISUAL_EXIT=$VISUAL_EXIT
- STRUCTURAL_EXIT=$STRUCTURAL_EXIT

The autopilot completed all mechanical V1 gates for Ground, Focus, Replay, mobile safety, and final packaging.
Final visual taste remains a human screenshot verdict.
EOF

DOWNLOAD_LINK=""
if [ "$COMMIT_RECEIPT" = "1" ]; then
  mkdir -p docs/receipts/screenshots docs/receipts/loops
  DST_ZIP="docs/receipts/screenshots/v1-autopilot-review-$HEAD_SHORT-$STAMP.zip"
  DST_MD="docs/receipts/loops/v1-autopilot-$HEAD_SHORT-$STAMP.md"
  cp "$ZIP" "$DST_ZIP"
  cp "$OUT/v1-autopilot-receipt.md" "$DST_MD"
  git add "$DST_ZIP" "$DST_MD" docs/receipts/visual-verdicts
  git commit -m "Record V1 autonomous review package"
  COMMIT_EXIT=$?
  summary "COMMIT_EXIT=$COMMIT_EXIT"
  git pull --rebase origin main 2>&1 | tee "$OUT/rebase.log"
  REBASE_EXIT=${PIPESTATUS[0]}
  summary "REBASE_EXIT=$REBASE_EXIT"
  git push origin main 2>&1 | tee "$OUT/push.log"
  PUSH_EXIT=${PIPESTATUS[0]}
  summary "PUSH_EXIT=$PUSH_EXIT"
  DOWNLOAD_LINK="https://github.com/LifeLoggerAI/urai-spatial/raw/main/$DST_ZIP"
fi

echo
echo "=== AUTOPILOT COMPLETE ==="
cat "$OUT/summary.txt"
echo "UPLOAD_ZIP=$ZIP"
[ -n "$DOWNLOAD_LINK" ] && echo "DOWNLOAD_LINK=$DOWNLOAD_LINK"
echo "OUT=$OUT"
