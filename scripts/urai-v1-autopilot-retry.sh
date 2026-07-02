#!/usr/bin/env bash
set +e

if [ -d "$HOME/urai-spatial/.git" ]; then
  cd "$HOME/urai-spatial"
elif [ -d "$HOME/urai-work/urai-spatial/.git" ]; then
  cd "$HOME/urai-work/urai-spatial"
else
  echo "Could not find urai-spatial repo."
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# Preserve generated audit output from a failed run without letting it block retry.
GENERATED_PATHS=(
  docs/receipts/V123_ASSET_WALL_AUDIT.latest.json
  docs/receipts/visual-verdicts/v1-autopilot-machine-visual-verdict.json
  docs/receipts/visual-verdicts/v1-autopilot-machine-visual-verdict.md
  docs/receipts/visual-verdicts/v1-autopilot-structural-audit.json
  docs/receipts/visual-verdicts/v1-autopilot-structural-audit.md
)

if git status --porcelain -- "${GENERATED_PATHS[@]}" | grep -q .; then
  git stash push -u -m "v1-autopilot-generated-receipts-$STAMP" -- "${GENERATED_PATHS[@]}" || true
fi

# Refuse to hide actual source edits. Only generated proof output is auto-preserved.
if [ -n "$(git status --porcelain)" ]; then
  echo "STOP: non-generated source changes remain in the working tree."
  git status --short
  exit 1
fi

# Reproducible build output can be recreated and is safe to clear before a 98%-disk build.
rm -rf .next out urai-tier1/.next urai-tier1/out 2>/dev/null || true
rm -rf "$HOME/.cache/firebase" 2>/dev/null || true
pnpm store prune >/dev/null 2>&1 || true

echo "DISK_STATUS_BEFORE_RETRY"
df -h "$HOME"

git pull --ff-only origin main || exit 1

COMMIT_RECEIPT="${COMMIT_RECEIPT:-1}" bash scripts/urai-v1-autopilot.sh
AUTOPILOT_EXIT_CODE=$?

echo
echo "AUTOPILOT_EXIT_CODE=$AUTOPILOT_EXIT_CODE"
LATEST="$(ls -td "$HOME"/urai-final-receipts/v1-autopilot-* 2>/dev/null | head -1)"
echo "LATEST=$LATEST"
cat "$LATEST/summary.txt" 2>/dev/null || true
cat "$LATEST/structural-audit.log" 2>/dev/null || true
grep -R '^DOWNLOAD_LINK=' "$LATEST" 2>/dev/null | tail -1 || true

echo "Cloud Shell remains open."
exit "$AUTOPILOT_EXIT_CODE"
