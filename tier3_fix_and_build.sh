#!/usr/bin/env bash
set -euo pipefail

# Tier-3 lock script (bash-only). Run from anywhere; set ROOT to tier1 path if needed.
PASS="tier3_fix_and_build"
ROOT="${ROOT:-$(pwd)}"
AUDIT_DIR="$ROOT/_audit/$(date +%Y%m%d_%H%M%S)_${PASS}"
LOG="/tmp/${PASS}.log"
TMP="/tmp/${PASS}.tmp"

mkdir -p "$AUDIT_DIR"
exec > >(tee "$LOG") 2>&1

_on_error() {
  rc=$?
  echo
  echo "=== SCRIPT FAILED (rc=$rc) ==="
  echo "See log: $LOG"
  echo "Backups (if any) under: $AUDIT_DIR"
  echo
  read -rp "Press Enter to close... "
  exit $rc
}
_on_success() {
  echo
  echo "=== SCRIPT COMPLETED ==="
  echo "See log: $LOG"
  echo "Backups: $AUDIT_DIR"
  echo
  read -rp "Press Enter to close... "
  exit 0
}
trap _on_error ERR
trap _on_success EXIT

echo "PASS=$PASS"
echo "ROOT=$ROOT"
echo "AUDIT_DIR=$AUDIT_DIR"
echo

# file targets
CAM_RIG="$ROOT/src/spatial/components/CinematicCameraRig.tsx"
SPATIAL_SCENE="$ROOT/src/spatial/scene/SpatialScene.tsx"
LIFEMAP="$ROOT/src/spatial/components/LifeMapStarfield.tsx"
FOCUS_SUB="$ROOT/src/spatial/components/FocusSubject.tsx"

# quick sanity
for f in "$CAM_RIG" "$SPATIAL_SCENE" "$LIFEMAP" "$FOCUS_SUB"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: required file missing: $f"
    echo "Adjust ROOT and re-run."
    exit 11
  fi
done

# backup originals
mkdir -p "$AUDIT_DIR/orig"
cp -a "$CAM_RIG" "$AUDIT_DIR/orig/CinematicCameraRig.tsx.orig"
cp -a "$SPATIAL_SCENE" "$AUDIT_DIR/orig/SpatialScene.tsx.orig"
cp -a "$LIFEMAP" "$AUDIT_DIR/orig/LifeMapStarfield.tsx.orig"
cp -a "$FOCUS_SUB" "$AUDIT_DIR/orig/FocusSubject.tsx.orig"
echo "Backed up originals to $AUDIT_DIR/orig"

# 1) Fix normalizePhase in CinematicCameraRig.tsx (safe replacement)
echo; echo "== Fixing normalizePhase in CinematicCameraRig.tsx =="

awk -v RS="\n" -v ORS="\n" '
  BEGIN { in_fn=0; replaced=0 }
  {
    if ($0 ~ /^function normalizePhase\(/ && replaced==0) {
      print "function normalizePhase(phase: string): '\''HOME'\'' | '\''ASCENT'\'' | '\''LIFEMAP'\'' | '\''FOCUS'\'' | '\''REPLAY'\'' {"
      print "  const p = String(phase || \"\").toUpperCase()"
      print "  if (p === '\''ASCENT'\'') return '\''ASCENT'\''"
      print "  if (p === '\''LIFEMAP'\'') return '\''LIFEMAP'\''"
      print "  if (p === '\''FOCUS'\'') return '\''FOCUS'\''"
      print "  if (p === '\''REPLAY'\'') return '\''REPLAY'\''"
      print "  return '\''HOME'\''"
      print "}"
      in_fn=1
      replaced=1
      next
    }
    if (in_fn==1) {
      # skip until a single-line "}"
      if ($0 ~ /^[[:space:]]*}[[:space:]]*$/) { in_fn=0; next }
      next
    }
    print
  }
  END {
    if (replaced==0) {
      print "FAILED_TO_REPLACE_normalizePhase" > "/dev/stderr"
      exit 2
    }
  }
' "$CAM_RIG" > "$TMP" && mv "$TMP" "$CAM_RIG"

echo "normalizePhase rewritten."

# 2) Inject normalized p variable inside the CinematicCameraRig component (right after the component signature)
echo; echo "== Injecting canonical p = normalizePhase(phase) in CinematicCameraRig component =="

awk -v ORS="\n" '
  { print $0 }
  /^export default function CinematicCameraRig\(/ && inserted!=1 {
    print "  // canonical normalized phase for safe comparisons"
    print "  const p = normalizePhase(phase)"
    inserted=1
  }
' "$CAM_RIG" > "$TMP" && mv "$TMP" "$CAM_RIG"

echo "Injected normalized p."

# 3) Inject safe REPLAY camera nudge (non-invasive, add a tiny guard immediately after any "if (p === 'REPLAY')" opening)
echo; echo "== Adding safe REPLAY camera nudge in CinematicCameraRig =="

awk -v ORS="\n" '
  BEGIN { inserted=0 }
  {
    print $0
    if ($0 ~ /if\s*\(\s*p\s*===\s*'\''REPLAY'\''\s*\)\s*\{\s*$/ && inserted==0) {
      print "    // safety: nudge camera back to avoid intersecting replay core"
      print "    try {"
      print "      if (toPos && toPos.current) {"
      print "        const safeOffset = 12"
      print "        toPos.current.z = (typeof toPos.current.z === \"number\" ? toPos.current.z : toPos.current.z) - safeOffset"
      print "      }"
      print "      if (transitionDurationMs && transitionDurationMs.current) {"
      print "        transitionDurationMs.current = Math.max(2200, transitionDurationMs.current)"
      print "      }"
      print "    } catch(e) {}"
      inserted=1
    }
  }
' "$CAM_RIG" > "$TMP" && mv "$TMP" "$CAM_RIG" || true

echo "REPLAY camera nudge inserted (where anchor found)."

# 4) Ensure LifeMapStarfield onSelectStar -> openFocus (not openReplay)
echo; echo "== Replacing direct openReplay handlers in LifeMapStarfield with openFocus (guarded) =="

# Conservative sed: replace common pattern where openReplay is called in onSelectStar handler
# This will convert any "onSelectStar={(id) => { ... openReplay(... ) }}" to openFocus variant if present.
sed -n '1,99999p' "$LIFEMAP" > "$TMP"
# Replace the simplest direct pattern; keep conservative
sed -e "s/openReplay(\s*\([^)]*\)\s*)/openFocus(\\1)/g" "$TMP" > "${TMP}.2" || true
mv "${TMP}.2" "$LIFEMAP"

echo "LifeMapStarfield: openReplay -> openFocus replacement attempted."

# 5) Patch SpatialScene: insert replayAtmosphere constants and Escape unwind handler and home-sky debounce
echo; echo "== Patching SpatialScene: replayAtmosphere, Escape unwind, home-sky debounce =="

awk -v ORS="\n" '
  BEGIN { done_consts=0; done_escape=0; done_debounce=0 }
  {
    # Insert constants after we detect a phase variable declaration (best-effort)
    if ($0 ~ /const .*phase.*=/ && done_consts==0) {
      print $0
      print ""
      print "  // Replay atmosphere (locked) - shortcuts for background/fog while in REPLAY"
      print "  const replayAtmosphere = (typeof normalizePhase === 'function' ? normalizePhase(phase) === 'REPLAY' : phase === 'REPLAY')"
      print "  const backgroundColor = replayAtmosphere ? '#01030a' : '#020611'"
      print "  const fogColor = replayAtmosphere ? '#050816' : '#020611'"
      print "  const fogNear = replayAtmosphere ? 18 : 60"
      print "  const fogFar = replayAtmosphere ? 130 : 260"
      print ""
      done_consts=1
      next
    }

    # Before Canvas, insert Escape handler once
    if ($0 ~ /<Canvas/ && done_escape==0) {
      print ""
      print "  // Escape unwind handler: canonical chain REPLAY -> FOCUS -> LIFEMAP -> HOME"
      print "  React.useEffect(() => {"
      print "    function onKey(e: KeyboardEvent) {"
      print "      if (e.key !== 'Escape') return"
      print "      const p = (typeof normalizePhase === 'function') ? normalizePhase(phase) : phase"
      print "      if (p === 'REPLAY') { if (typeof openFocus === 'function') { openFocus(selectedStarId ?? undefined, selectedStarPosition ?? undefined); return } }"
      print "      if (p === 'FOCUS') { if (typeof openLifeMap === 'function') { openLifeMap(); return } }"
      print "      if (p === 'LIFEMAP') { if (typeof openHome === 'function') { openHome(); return } }"
      print "    }"
      print "    window.addEventListener('keydown', onKey)"
      print "    return () => window.removeEventListener('keydown', onKey)"
      print "  }, [phase, selectedStarId, selectedStarPosition])"
      print ""
      done_escape=1
    }

    # Replace onSkySelect={openAscent} with a debounced inline wrapper (global debounce)
    if (index($0, \"onSkySelect={openAscent}\") > 0 && done_debounce==0) {
      gsub(/onSkySelect=\{openAscent\}/, \"onSkySelect={(ev)=>{ if (window.__openAscentDeb) { clearTimeout(window.__openAscentDeb) } window.__openAscentDeb = window.setTimeout(()=>{ try { (openAscent as any)(ev) } catch(e){} }, 90) }}\")
      done_debounce=1
    }

    print $0
  }
' "$SPATIAL_SCENE" > "$TMP" && mv "$TMP" "$SPATIAL_SCENE"

echo "SpatialScene patched (where anchors matched)."

# 6) Ensure Canvas has background/fog wiring: if <color attach="background"... not present, add minimal fallback
if ! rg -n "<color attach=\\\"background\\\"" "$SPATIAL_SCENE" >/dev/null 2>&1; then
  echo "Adding fallback background & fog wiring into Canvas in SpatialScene."
  # insert immediately after first occurrence of "<Canvas"
  awk -v ORS="\n" '
    { print $0 }
    /^<Canvas/ && added==0 {
      print "        <color attach=\"background\" args={[backgroundColor]} />"
      print "        <fog attach=\"fog\" args={[fogColor, fogNear, fogFar]} />"
      added=1
    }
  ' "$SPATIAL_SCENE" > "$TMP" && mv "$TMP" "$SPATIAL_SCENE"
else
  echo "Canvas background/fog already present; ensure it references backgroundColor/fogColor variables."
fi

# 7) Run TypeScript check and Next build (pnpm must be available)
echo; echo "== Verifying TypeScript and building =="
cd "$ROOT"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found in PATH. Please run on your dev machine where pnpm is installed."
  exit 20
fi

echo "Running tsc --noEmit ..."
pnpm exec tsc --noEmit

echo "Running pnpm build ..."
pnpm build

echo
echo "Done. Backups in: $AUDIT_DIR"
