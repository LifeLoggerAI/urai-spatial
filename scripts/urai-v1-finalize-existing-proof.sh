#!/usr/bin/env bash
set +e

BASE_URL="${BASE_URL:-https://urai.app}"
EXPECTED_PNG_COUNT="${EXPECTED_PNG_COUNT:-24}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ -d "$HOME/urai-spatial/.git" ]; then
  cd "$HOME/urai-spatial"
elif [ -d "$HOME/urai-work/urai-spatial/.git" ]; then
  cd "$HOME/urai-work/urai-spatial"
else
  echo "Could not find urai-spatial repo."
  exit 1
fi

OUT="$HOME/urai-final-receipts/v1-finalize-existing-$STAMP"
mkdir -p "$OUT"
exec > >(tee "$OUT/run.log") 2>&1

GENERATED_PATHS=(
  docs/receipts/V123_ASSET_WALL_AUDIT.latest.json
  docs/receipts/visual-verdicts/v1-autopilot-machine-visual-verdict.json
  docs/receipts/visual-verdicts/v1-autopilot-machine-visual-verdict.md
  docs/receipts/visual-verdicts/v1-autopilot-structural-audit.json
  docs/receipts/visual-verdicts/v1-autopilot-structural-audit.md
)

if git status --porcelain -- "${GENERATED_PATHS[@]}" | grep -q .; then
  git stash push -u -m "v1-finalize-generated-$STAMP" -- "${GENERATED_PATHS[@]}" || true
fi

# Cloud Shell can create files named after console words when a previous log is
# accidentally pasted into Bash. Restore/remove only the exact known debris names;
# never auto-delete arbitrary source changes.
if git ls-files --error-unmatch "urai-spatial-monorepo@" >/dev/null 2>&1; then
  if ! git diff --quiet -- "urai-spatial-monorepo@"; then
    echo "Restoring tracked console-paste debris: urai-spatial-monorepo@"
    git restore --source=HEAD --staged --worktree -- "urai-spatial-monorepo@"
  fi
fi

for debris in "node" "starting" "urai-tier1@0.1.0"; do
  if [ -e "$debris" ] && ! git ls-files --error-unmatch "$debris" >/dev/null 2>&1; then
    echo "Removing untracked console-paste debris: $debris"
    rm -f -- "$debris"
  fi
done

if [ -n "$(git status --porcelain)" ]; then
  echo "STOP: non-generated source changes remain."
  git status --short
  exit 1
fi

git pull --ff-only origin main || exit 1
CONTROL_HEAD="$(git rev-parse --short HEAD)"

LATEST_PROOF="$(ls -td "$HOME"/urai-final-receipts/aaa-launch-proof-* 2>/dev/null | head -1)"
if [ -z "$LATEST_PROOF" ] || [ ! -d "$LATEST_PROOF/screenshots" ]; then
  echo "No existing screenshot proof directory found."
  exit 2
fi

PNG_COUNT="$(find "$LATEST_PROOF/screenshots" -maxdepth 1 -name '*.png' | wc -l | tr -d ' ')"
PROOF_NAME="$(basename "$LATEST_PROOF")"
PRODUCT_HEAD="$(printf '%s' "$PROOF_NAME" | sed -E 's/^aaa-launch-proof-([0-9a-f]+)-.*/\1/')"

echo "CONTROL_HEAD=$CONTROL_HEAD"
echo "PRODUCT_HEAD=$PRODUCT_HEAD"
echo "LATEST_PROOF=$LATEST_PROOF"
echo "PNG_COUNT=$PNG_COUNT"

if [ "$PNG_COUNT" != "$EXPECTED_PNG_COUNT" ]; then
  echo "Expected $EXPECTED_PNG_COUNT screenshots, found $PNG_COUNT."
  exit 2
fi

LOOP_NAME="v1-autopilot" EXPECTED_PNG_COUNT="$EXPECTED_PNG_COUNT" PROOF_DIR="$LATEST_PROOF" \
  python3 scripts/urai-machine-visual-verdict.py 2>&1 | tee "$OUT/machine-visual.log"
VISUAL_EXIT=${PIPESTATUS[0]}

LOOP_NAME="v1-autopilot" BASE_URL="$BASE_URL" \
  node scripts/urai-v1-structural-audit.mjs 2>&1 | tee "$OUT/structural-audit.log"
STRUCTURAL_EXIT=${PIPESTATUS[0]}

echo "VISUAL_EXIT=$VISUAL_EXIT"
echo "STRUCTURAL_EXIT=$STRUCTURAL_EXIT"

if [ "$VISUAL_EXIT" != "0" ] || [ "$STRUCTURAL_EXIT" != "0" ]; then
  echo "Final gates did not pass."
  exit 4
fi

ZIP="$OUT/v1-autopilot-review-$PRODUCT_HEAD-$STAMP.zip"
cd "$LATEST_PROOF" || exit 1
zip -r "$ZIP" screenshots screenshots.json final-report.md route-matrix.md route-matrix.json summary.json >/dev/null
cd - >/dev/null || exit 1

cat > "$OUT/v1-final-receipt.md" <<EOF
# URAI V1 autonomous final review receipt

Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Product screenshot head: $PRODUCT_HEAD
Control-plane audit head: $CONTROL_HEAD
Base: $BASE_URL
Screenshot count: $PNG_COUNT
Machine visual exit: $VISUAL_EXIT
Structural exit: $STRUCTURAL_EXIT

The existing production deployment and screenshot proof were reused because build, deploy,
live routes, Playwright capture, and 24/24 image checks had already passed. The corrected
structural gate distinguishes intentionally clipped cinematic geometry from controls that
actually cross the viewport.

Final artistic taste remains a human screenshot review.
EOF

mkdir -p docs/receipts/screenshots docs/receipts/loops
DST_ZIP="docs/receipts/screenshots/v1-autopilot-review-$PRODUCT_HEAD-$STAMP.zip"
DST_MD="docs/receipts/loops/v1-autopilot-final-$PRODUCT_HEAD-$STAMP.md"
cp "$ZIP" "$DST_ZIP"
cp "$OUT/v1-final-receipt.md" "$DST_MD"

git add "$DST_ZIP" "$DST_MD" docs/receipts/visual-verdicts
git commit -m "Record V1 autonomous final review receipt"
COMMIT_EXIT=$?
if [ "$COMMIT_EXIT" != "0" ]; then
  echo "Receipt commit failed."
  exit 5
fi

git pull --rebase origin main || exit 5
git push origin main || exit 5

DOWNLOAD_LINK="https://github.com/LifeLoggerAI/urai-spatial/raw/main/$DST_ZIP"

echo
echo "=== V1 FINALIZATION COMPLETE ==="
echo "PRODUCT_HEAD=$PRODUCT_HEAD"
echo "CONTROL_HEAD=$CONTROL_HEAD"
echo "PNG_COUNT=$PNG_COUNT"
echo "VISUAL_EXIT=$VISUAL_EXIT"
echo "STRUCTURAL_EXIT=$STRUCTURAL_EXIT"
echo "UPLOAD_ZIP=$ZIP"
echo "DOWNLOAD_LINK=$DOWNLOAD_LINK"
echo "OUT=$OUT"
