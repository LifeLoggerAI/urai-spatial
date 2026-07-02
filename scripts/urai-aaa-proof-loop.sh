#!/usr/bin/env bash
set +e

# URAI AAA proof loop
# Purpose: one command for the repeated production rhythm:
# pull -> audit -> typecheck -> static build -> deploy retry -> live screenshot proof -> zip -> optional receipt commit.

LOOP_NAME="${LOOP_NAME:-aaa-proof-loop}"
BASE_URL="${BASE_URL:-https://urai.app}"
FIREBASE_PROJECT="${FIREBASE_PROJECT_ID:-urai-4dc1d}"
COMMIT_RECEIPT="${COMMIT_RECEIPT:-0}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"
MAX_DEPLOY_ATTEMPTS="${MAX_DEPLOY_ATTEMPTS:-6}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ -d "$HOME/urai-spatial/.git" ]; then
  cd "$HOME/urai-spatial"
elif [ -d "$HOME/urai-work/urai-spatial/.git" ]; then
  cd "$HOME/urai-work/urai-spatial"
else
  echo "Could not find urai-spatial repo."
  exit 1
fi

OUT="$HOME/urai-final-receipts/${LOOP_NAME}-${STAMP}"
mkdir -p "$OUT"

exec > >(tee "$OUT/run.log") 2>&1

echo "# URAI AAA proof loop"
echo "OUT=$OUT"
echo "BASE_URL=$BASE_URL"
echo "FIREBASE_PROJECT=$FIREBASE_PROJECT"
echo "COMMIT_RECEIPT=$COMMIT_RECEIPT"
echo "SKIP_DEPLOY=$SKIP_DEPLOY"
echo "SKIP_BUILD=$SKIP_BUILD"
echo

echo "=== SYNC MAIN ==="
git fetch origin main
git reset --hard origin/main
GIT_HEAD="$(git rev-parse --short HEAD)"
echo "GIT_HEAD=$GIT_HEAD" | tee "$OUT/summary.txt"
git log -12 --oneline | tee "$OUT/git-heads.txt"

echo
echo "=== ASSET WALL AUDIT ==="
node scripts/audit-v123-asset-wall.mjs 2>&1 | tee "$OUT/v123-asset-wall-audit.log"
AUDIT_EXIT=${PIPESTATUS[0]}
echo "AUDIT_EXIT=$AUDIT_EXIT" | tee -a "$OUT/summary.txt"

echo
echo "=== PLAYWRIGHT CHROMIUM ENSURE ==="
pnpm exec playwright install chromium 2>&1 | tee "$OUT/playwright-install.log"
PW_EXIT=${PIPESTATUS[0]}
echo "PW_EXIT=$PW_EXIT" | tee -a "$OUT/summary.txt"

echo
echo "=== TYPECHECK ==="
pnpm typecheck 2>&1 | tee "$OUT/typecheck.log"
TYPECHECK_EXIT=${PIPESTATUS[0]}
echo "TYPECHECK_EXIT=$TYPECHECK_EXIT" | tee -a "$OUT/summary.txt"

BUILD_EXIT=0
if [ "$SKIP_BUILD" != "1" ]; then
  echo
  echo "=== STATIC BUILD ==="
  rm -rf urai-tier1/.next urai-tier1/out .next out
  pnpm build:static 2>&1 | tee "$OUT/build-static.log"
  BUILD_EXIT=${PIPESTATUS[0]}
fi
echo "BUILD_EXIT=$BUILD_EXIT" | tee -a "$OUT/summary.txt"

DEPLOY_EXIT=0
if [ "$SKIP_DEPLOY" != "1" ]; then
  if [ "$TYPECHECK_EXIT" != "0" ] || [ "$BUILD_EXIT" != "0" ]; then
    echo "FAILED BEFORE DEPLOY"
    echo "OUT=$OUT"
    exit 1
  fi

  echo
  echo "=== FIREBASE DEPLOY RETRY LOOP ==="
  DEPLOY_EXIT=1
  i=1
  while [ "$i" -le "$MAX_DEPLOY_ATTEMPTS" ]; do
    echo "----- DEPLOY ATTEMPT $i / $MAX_DEPLOY_ATTEMPTS -----"
    firebase deploy --config firebase.static.json --only hosting --project "$FIREBASE_PROJECT" --non-interactive 2>&1 | tee "$OUT/firebase-deploy-$i.log"
    DEPLOY_EXIT=${PIPESTATUS[0]}
    echo "DEPLOY_EXIT_ATTEMPT_$i=$DEPLOY_EXIT" | tee -a "$OUT/summary.txt"
    [ "$DEPLOY_EXIT" = "0" ] && break
    rm -rf "$HOME/.cache/firebase" 2>/dev/null
    sleep 20
    i=$((i+1))
  done
fi
echo "DEPLOY_EXIT=$DEPLOY_EXIT" | tee -a "$OUT/summary.txt"

echo
echo "=== LIVE ROUTE PROOF ==="
CACHE_BUST="$(date +%s)"
: > "$OUT/live-proof.txt"
for path in \
  "/home?loop=$CACHE_BUST" \
  "/ground?loop=$CACHE_BUST" \
  "/life-map?loop=$CACHE_BUST" \
  "/focus?memoryId=quiet-reset&loop=$CACHE_BUST" \
  "/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&loop=$CACHE_BUST" \
  "/mirror?loop=$CACHE_BUST" \
  "/passport?loop=$CACHE_BUST" \
  "/status?loop=$CACHE_BUST" \
  "/privacy-controls?loop=$CACHE_BUST" \
  "/location-map?loop=$CACHE_BUST" \
  "/spatial/ar-vr?loop=$CACHE_BUST" \
  "/assets/urai/final/manifests/urai-final-assets.json?loop=$CACHE_BUST"
do
  code="$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE_URL$path")"
  echo "$code $BASE_URL$path" | tee -a "$OUT/live-proof.txt"
done

echo
echo "=== SCREENSHOT PROOF ==="
node scripts/aaa-launch-proof.mjs \
  --skip-install \
  --skip-typecheck \
  --skip-test \
  --skip-build \
  --screenshots \
  --base="$BASE_URL" 2>&1 | tee "$OUT/aaa-launch-proof.log"
PROOF_EXIT=${PIPESTATUS[0]}
echo "PROOF_EXIT=$PROOF_EXIT" | tee -a "$OUT/summary.txt"

LATEST_PROOF="$(ls -td "$HOME"/urai-final-receipts/aaa-launch-proof-* 2>/dev/null | head -1)"
echo "LATEST_PROOF=$LATEST_PROOF" | tee -a "$OUT/summary.txt"

PNG_COUNT=0
ZIP=""
if [ -n "$LATEST_PROOF" ] && [ -d "$LATEST_PROOF/screenshots" ]; then
  PNG_COUNT="$(find "$LATEST_PROOF/screenshots" -maxdepth 1 -name '*.png' | wc -l | tr -d ' ')"
  ZIP="$OUT/${LOOP_NAME}-${GIT_HEAD}-screenshots.zip"
  cd "$LATEST_PROOF" || exit 1
  zip -r "$ZIP" screenshots screenshots.json final-report.md route-matrix.md route-matrix.json summary.json 2>&1 | tee "$OUT/zip.log"
  cd - >/dev/null || exit 1
fi

echo "PNG_COUNT=$PNG_COUNT" | tee -a "$OUT/summary.txt"
echo "ZIP=$ZIP" | tee -a "$OUT/summary.txt"

cat > "$OUT/${LOOP_NAME}-receipt.md" <<EOF
# URAI AAA proof loop receipt

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Loop: $LOOP_NAME
Head: $GIT_HEAD
Base: $BASE_URL

## Exit codes

- AUDIT_EXIT=$AUDIT_EXIT
- PW_EXIT=$PW_EXIT
- TYPECHECK_EXIT=$TYPECHECK_EXIT
- BUILD_EXIT=$BUILD_EXIT
- DEPLOY_EXIT=$DEPLOY_EXIT
- PROOF_EXIT=$PROOF_EXIT
- PNG_COUNT=$PNG_COUNT

## Live proof

$(cat "$OUT/live-proof.txt")

## Screenshot archive

$ZIP

## Manual gates still required

- Human visual review of screenshots.
- Bespoke V1 art replacement where screenshots look weak.
- V2 state assets.
- V3 Quest/device physical proof.
EOF

if [ "$COMMIT_RECEIPT" = "1" ]; then
  echo
  echo "=== COMMIT RECEIPT TO REPO ==="
  mkdir -p docs/receipts/screenshots docs/receipts/loops
  RECEIPT_DST="docs/receipts/loops/${LOOP_NAME}-${GIT_HEAD}-${STAMP}.md"
  cp "$OUT/${LOOP_NAME}-receipt.md" "$RECEIPT_DST"
  if [ -n "$ZIP" ] && [ -f "$ZIP" ]; then
    ZIP_DST="docs/receipts/screenshots/${LOOP_NAME}-${GIT_HEAD}-${STAMP}.zip"
    cp "$ZIP" "$ZIP_DST"
    git add "$ZIP_DST"
  fi
  git add "$RECEIPT_DST"
  git commit -m "Record ${LOOP_NAME} proof loop receipt"
  COMMIT_EXIT=$?
  echo "COMMIT_EXIT=$COMMIT_EXIT" | tee -a "$OUT/summary.txt"
  git push origin main
  PUSH_EXIT=$?
  echo "PUSH_EXIT=$PUSH_EXIT" | tee -a "$OUT/summary.txt"
fi

echo
echo "=== IMPORTANT LINES ==="
grep -nE "AUDIT_EXIT|PW_EXIT|TYPECHECK_EXIT|BUILD_EXIT|DEPLOY_EXIT|PROOF_EXIT|PNG_COUNT|OK 200|SHOT |Quest proof|present=|missing=" "$OUT"/*.log "$OUT"/*.txt 2>/dev/null | tail -260 | tee "$OUT/important-lines.txt"

echo
echo "=== DONE ==="
cat "$OUT/summary.txt"
echo "OUT=$OUT"
if [ -n "$ZIP" ]; then echo "UPLOAD_ZIP=$ZIP"; fi
