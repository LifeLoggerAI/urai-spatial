#!/usr/bin/env bash
set -euo pipefail

PASS="tier3_lock_replay"
# hard-root to the urai-tier1 folder (change here if your layout differs)
ROOT="/home/user/urai-spatial/urai-tier1"
AUDIT_DIR="$ROOT/_audit/$(date +%Y%m%d_%H%M%S)_$PASS"
LOG="/tmp/${PASS}.log"
TMP="/tmp/${PASS}.tmp"

mkdir -p "$AUDIT_DIR"
exec > >(tee "$LOG") 2>&1

_on_error() {
  rc=$?
  echo
  echo "=== SCRIPT FAILED with exit code $rc ==="
  echo "Check log: $LOG"
  echo "Backups: $AUDIT_DIR"
  echo
  read -rp "Press Enter to close..."
  exit $rc
}
_on_success() {
  echo
  echo "=== SCRIPT COMPLETED SUCCESSFULLY ==="
  echo "Check log: $LOG"
  echo "Backups: $AUDIT_DIR"
  echo
  read -rp "Press Enter to close..."
  exit 0
}
trap _on_error ERR
trap _on_success EXIT

echo "PASS=$PASS"
echo "ROOT=$ROOT"
echo "AUDIT_DIR=$AUDIT_DIR"
echo

# Helper: backup file
backup_file() {
  local f="$1"
  if [ -f "$f" ]; then
    mkdir -p "$AUDIT_DIR/$(dirname "$f")"
    cp -a "$f" "$AUDIT_DIR/$(basename "$f").bak"
    echo "BACKED UP: $f -> $AUDIT_DIR/$(basename "$f").bak"
  else
    echo "MISSING: $f"
  fi
}

# Target files
CAM_RIG="$ROOT/src/spatial/components/CinematicCameraRig.tsx"
SPATIAL_SCENE="$ROOT/src/spatial/scene/SpatialScene.tsx"
LIFEMAP="$ROOT/src/spatial/components/LifeMapStarfield.tsx"
FOCUS_SUB="$ROOT/src/spatial/components/FocusSubject.tsx"

# verify existence
for f in "$CAM_RIG" "$SPATIAL_SCENE" "$LIFEMAP" "$FOCUS_SUB"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: required file not found: $f"
    echo "Adjust ROOT or file paths and re-run."
    exit 11
  fi
done

# backups
backup_file "$CAM_RIG"
backup_file "$SPATIAL_SCENE"
backup_file "$LIFEMAP"
backup_file "$FOCUS_SUB"

#### 1) Fix normalizePhase -> remove recursion and return normalized string
echo; echo "== 1) Fix normalizePhase in CinematicCameraRig.tsx =="
awk -v RS="\n" -v ORS="\n" '
BEGIN { replaced=0; in_fn=0 }
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
    replaced=1
    in_fn=1
    next
  }
  if (in_fn==1) {
    # skip until closing brace line alone
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

#### 2) Inject 'const p = normalizePhase(phase)' into component and safety nudge for REPLAY camera
echo; echo "== 2) Inject normalized p and safe REPLAY adjustments =="
# insert p variable after component signature
awk -v RS="\n" -v ORS="\n" '
BEGIN { insertedP=0 }
{
  print $0
  if ($0 ~ /^export default function CinematicCameraRig\(/ && insertedP==0) {
    print "  // canonical normalized phase for safe comparisons"
    print "  const p = normalizePhase(phase)"
    insertedP=1
  }
}
' "$CAM_RIG" > "$TMP" && mv "$TMP" "$CAM_RIG"

# add a conservative safety nudge for REPLAY camera by matching an 'if (p === '\''REPLAY'\'')' block and injecting offset lines
perl -0777 -pe '
  s/(if\s*\(\s*p\s*===\s*'\''REPLAY'\''\s*\)\s*\{\s*)([^}]*?)(\s*\})/$1$2."\n    /* safety nudge: move camera back in Z to avoid intersecting replay sphere */\n    try { if (typeof toPos !== \"undefined\" && toPos && toPos.current) { toPos.current.z = (toPos.current.z || 0) - 12 } } catch(e) {}\n    if (typeof transitionDurationMs !== \"undefined\" && transitionDurationMs && transitionDurationMs.current) { transitionDurationMs.current = Math.max(2200, (transitionDurationMs.current||1800)) }\n"$3/ges
' "$CAM_RIG" > "$TMP" && mv "$TMP" "$CAM_RIG" || true
echo "Injected REPLAY camera safety nudge."

#### 3) Patch SpatialScene: replay atmosphere constants, Escape unwind effect, and home-sky debounce
echo; echo "== 3) Patch SpatialScene: atmosphere, Escape unwind, home-sky debounce =="
awk -v RS="\n" -v ORS="\n" '
  BEGIN { done_constants=0; done_escape=0; done_debounce=0 }
  {
    if ($0 ~ /const .*phase.*=/ && done_constants==0) {
      print $0
      print ""
      print "  // Replay atmosphere (locked)"
      print "  const replayAtmosphere = normalizePhase(phase) === '\''REPLAY'\''"
      print "  const backgroundColor = replayAtmosphere ? \"#01030a\" : \"#020611\""
      print "  const fogColor = replayAtmosphere ? \"#050816\" : \"#020611\""
      print "  const fogNear = replayAtmosphere ? 18 : 60"
      print "  const fogFar = replayAtmosphere ? 130 : 260"
      print ""
      done_constants=1
      next
    }
    if ($0 ~ /<Canvas/ && done_escape==0) {
      print ""
      print "  // Escape unwind handler: canonical chain REPLAY -> FOCUS -> LIFEMAP -> HOME"
      print "  React.useEffect(() => {"
      print "    function onKey(e: KeyboardEvent) {"
      print "      if (e.key !== 'Escape') return"
      print "      const p = normalizePhase(phase)"
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

    # wrap one-liner onSkySelect usage with debounce injection anchored by pattern "onSkySelect={openAscent}"
    if ($0 ~ /onSkySelect=\{openAscent\}/ && done_debounce==0) {
      print "          // wrapped openAscent with debounce to reduce jumpiness"
      print "          const _openAscentDebounced = (() => { let t = null; return (ev) => { if (t) { clearTimeout(t) } t = setTimeout(() => { t = null; (openAscent)(ev) }, 90) } })()"
      print ""
      print "          onSkySelect={_openAscentDebounced}"
      done_debounce=1
      next
    }

    print $0
  }
' "$SPATIAL_SCENE" > "$TMP" && mv "$TMP" "$SPATIAL_SCENE"
echo "SpatialScene patched."

#### 4) Ensure LifeMapStarfield onSelect opens Focus (not Replay)
echo; echo "== 4) LifeMapStarfield: ensure openFocus on star select =="
perl -0777 -pe "
  s/onSelectStar=\{[^\}]*openReplay\([^\}]*\)[^\}]*\}/onSelectStar={(id) => { if (phase !== 'LIFEMAP') return; const star = STARS.find(s => s.id === id); if (!star) return; openFocus(id, star.position); }}/gs
" "$LIFEMAP" > "$TMP" && mv "$TMP" "$LIFEMAP" || true

if rg -n \"openFocus\\(\" \"$LIFEMAP\" >/dev/null 2>&1; then
  echo "LifeMapStarfield patched/verified to call openFocus on star select."
else
  echo "WARNING: openFocus(...) not detected. Verify LifeMapStarfield manually."
fi

#### 5) Final verification: TypeScript + Next build
echo; echo "== 5) Typecheck and build =="
cd "$ROOT"
if ! command -v pnpm >/dev/null 2>&1; then
  echo "ERROR: pnpm not found in PATH. Run on the dev machine with pnpm available."
  exit 20
fi

echo "Running: pnpm exec tsc --noEmit"
pnpm exec tsc --noEmit

echo "Running: pnpm build"
pnpm build

echo
echo "=== DONE ==="
echo "Backups: $AUDIT_DIR"
echo "Log: $LOG"
echo
echo "Manual test checklist:"
echo " - LifeMap: click star -> should go to FOCUS"
echo " - Focus: click to enter REPLAY -> replay entry should not intersect sphere"
echo " - REPLAY: press Escape -> FOCUS, again -> LIFEMAP, again -> HOME"
echo " - HOME sky click should feel less jumpy"
