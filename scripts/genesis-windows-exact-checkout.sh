#!/usr/bin/env bash
# Run in Git Bash on Windows. READ-ONLY checkout/build; not a deployment.
set -Eeuo pipefail

PINNED_SHA='2cad0120f23fa493aa903f07d3824fd8087c37f1'
BRANCH='parallel/digital-human-performance-20261018'
REMOTE='https://github.com/LifeLoggerAI/urai-spatial.git'
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
DEST="${1:-}"
MODE="${2:---checkout-only}"
if [[ -z "$DEST" || ( "$MODE" != '--checkout-only' && "$MODE" != '--build' ) ]]; then
  printf '%s\n' 'Usage (Git Bash): bash scripts/genesis-windows-exact-checkout.sh /c/ur/g [--build]' >&2
  exit 2
fi
if [[ -e "$DEST" ]]; then
  printf 'REFUSAL: destination already exists, will not overwrite: %s\n' "$DEST" >&2
  exit 2
fi
for tool in git node; do
  command -v "$tool" >/dev/null || { printf 'Missing required tool: %s\n' "$tool" >&2; exit 2; }
done
if [[ "$MODE" == '--build' ]]; then
  command -v corepack >/dev/null || { printf '%s\n' 'Install supported Node 22 with Corepack before --build.' >&2; exit 2; }
fi
case "$DEST" in
  /*) ;;
  *) printf '%s\n' 'REFUSAL: use an explicit absolute destination such as /c/ur/g' >&2; exit 2 ;;
esac
mkdir -p -- "$(dirname "$DEST")"
# No checkout occurs during clone: protects Windows from literal *audit paths.
git clone --filter=blob:none --no-checkout --single-branch --branch "$BRANCH" -- "$REMOTE" "$DEST"
if ! git -C "$DEST" cat-file -e "${PINNED_SHA}^{commit}"; then
  printf 'REFUSAL: pinned commit absent from cloned branch: %s\n' "$PINNED_SHA" >&2
  exit 2
fi
# Pin the local checkout HEAD BEFORE sparse materialization, even if origin
# advances during the clone. These commands change only this local checkout.
git -C "$DEST" update-ref refs/heads/urai-genesis-pinned "$PINNED_SHA"
git -C "$DEST" symbolic-ref HEAD refs/heads/urai-genesis-pinned
# Metadata-only tree inspection BEFORE sparse checkout; keep NTFS protection ON.
# The guard refuses selected paths containing Windows-forbidden names/collisions.
REPORT="$(dirname "$DEST")/genesis-windows-source-preflight-HOLD.json"
if command -v cygpath >/dev/null; then
  WINDOWS_ROOT="$(cygpath -w "$DEST")"
else
  WINDOWS_ROOT="$DEST"
fi
git -C "$DEST" ls-tree -r -z --name-only "$PINNED_SHA" \
  | node "$SCRIPT_DIR/genesis-windows-path-preflight.mjs" --checkout-root "$WINDOWS_ROOT" > "$REPORT"
printf 'Windows path report: %s\n' "$REPORT"
# Only known application/build directories. No historical *audit trees.
DIRS=(
  apps/functions packages/tier-locks packages/release-tools
  distribution/android-shell distribution/ios-shell
  scripts tests tools patches src
  urai-tier1/src urai-tier1/public urai-tier1/scripts
  urai-tier1/tests urai-tier1/tools urai-tier1/brand
  urai-tier1/demo urai-tier1/internal urai-tier1/docs
  urai-tier1/launch-pack urai-tier1/release-authority
)
git -C "$DEST" sparse-checkout init --cone
git -C "$DEST" -c core.longpaths=true sparse-checkout set --cone "${DIRS[@]}"
git -C "$DEST" -c core.longpaths=true checkout --detach "$PINNED_SHA"
ACTUAL="$(git -C "$DEST" rev-parse HEAD)"
[[ "$ACTUAL" == "$PINNED_SHA" ]] || { printf 'SOURCE_IDENTITY_MISMATCH: %s\n' "$ACTUAL" >&2; exit 2; }
# Exact known file blobs from the source-pinned PR for the corrected camera/sky.
verify_blob() {
  local want="$1" file="$2" got
  got="$(git -C "$DEST" hash-object "$DEST/$file")"
  [[ "$got" == "$want" ]] || { printf 'BLOB_MISMATCH %s %s %s\n' "$file" "$want" "$got" >&2; exit 2; }
}
verify_blob '1d5e06b3d8d1e83d3e22406d77fddce9a7b23326' 'urai-tier1/src/spatial/layout/HomeWorldProductionPolished.tsx'
verify_blob '7660d33bb75ff75ab8eee36f56f0c4ac0bdb5999' 'urai-tier1/src/spatial/layout/HomeSanctuaryMaterials.tsx'
verify_blob '01f807082c1f588809aa80505fac7362a9a5c866' 'urai-tier1/src/spatial/layout/homeAscentSkyFade.ts'
verify_blob '993e3914667ff28186382462d1c7b2d1ffb747df' 'urai-tier1/src/spatial/layout/homeAscentCinematicPath.ts'
verify_blob 'e03089664616a4626491f718f072819a338e666d' 'scripts/genesis-ascent-patched-review-capture.mjs'
printf 'CHECKOUT_ATTESTED SHA=%s\n' "$PINNED_SHA"
if [[ "$MODE" == '--build' ]]; then
  (cd "$DEST" && corepack pnpm install --frozen-lockfile)
  (cd "$DEST" && corepack pnpm --dir urai-tier1 exec tsc --noEmit -p tsconfig.runtime.json)
  (cd "$DEST" && corepack pnpm --dir urai-tier1 exec next build)
  printf '%s\n' 'CORRECTED_BUILD_COMMANDS_COMPLETED; browser pixel acceptance remains separate.'
else
  printf '%s\n' 'To build: cd to this checkout, then run corepack pnpm install --frozen-lockfile'
  printf '%s\n' 'Then: corepack pnpm --dir urai-tier1 exec tsc --noEmit -p tsconfig.runtime.json'
  printf '%s\n' 'Then: corepack pnpm --dir urai-tier1 exec next build'
fi
printf '%s\n' 'PRIVATE_HOLD_ONLY. No deploy, no publication, no customer data.'
