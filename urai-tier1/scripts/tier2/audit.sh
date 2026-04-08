#!/usr/bin/env bash
set -euo pipefail

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

[ -f package.json ] || die "run from repo root"
[ -d src/spatial ] || die "src/spatial missing"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "== Tier-2 audit =="

echo
echo "-- forbidden reducer shortcuts --"
if grep -RInE '\bSET_MODE\b|setMode\(' src >/dev/null 2>&1; then
  grep -RInE '\bSET_MODE\b|setMode\(' src
  die "forbidden mode shortcut detected"
fi

echo
echo "-- duplicate escape listeners --"
ESC_COUNT="$(grep -RInE "addEventListener\([\"']keydown[\"']|case[[:space:]]+[\"']Escape[\"']|key[[:space:]]*===?[[:space:]]*[\"']Escape[\"']" src | wc -l | tr -d ' ')"
printf 'ESC_PATTERN_COUNT=%s\n' "$ESC_COUNT"
[ "$ESC_COUNT" -le 6 ] || die "too many escape-key patterns; probable duplicate authority"

echo
echo "-- direct camera mutation outside allowed rig files --"
grep -RInE 'camera\.(position|quaternion)|camera\.lookAt\(' src \
  | grep -vE 'CinematicCameraRig|cameraCanon|CameraDirector|tier2Canon' > "$TMP" || true
if [ -s "$TMP" ]; then
  cat "$TMP"
  die "direct camera mutation outside allowed authority files"
fi

echo
echo "-- transition literals outside canon/state/authority files --"
grep -RInE 'home_to_ascent|ascent_to_lifemap|lifemap_to_focus|focus_to_replay|replay_to_focus|focus_to_lifemap|lifemap_to_home' src \
  | grep -vE 'tier2Canon|cameraCanon|state|sceneAuthority|useCanonEsc|transition|reducer|src/spatial/types' > "$TMP" || true
if [ -s "$TMP" ]; then
  cat "$TMP"
  die "transition literals found outside canon/state/authority files"
fi

echo
echo "-- required canon anchors --"
grep -RInF 'resolveEscAction' src >/dev/null 2>&1 || die "missing resolveEscAction usage"
grep -RInF 'showHomeLayer' src >/dev/null 2>&1 || die "missing showHomeLayer usage"
grep -RInF 'showLifeMapLayer' src >/dev/null 2>&1 || die "missing showLifeMapLayer usage"
grep -RInF 'showFocusLayer' src >/dev/null 2>&1 || die "missing showFocusLayer usage"
grep -RInF 'showReplayLayer' src >/dev/null 2>&1 || die "missing showReplayLayer usage"

echo
echo "-- randomness ban in canon paths --"
grep -RInE 'Math\.random|Date\.now|performance\.now' src/spatial/canon src/spatial/scene src/spatial/components \
  | grep -vE 'test|spec' > "$TMP" || true
if [ -s "$TMP" ]; then
  cat "$TMP"
  die "non-deterministic timing/randomness found in spatial canon paths"
fi

echo
echo "Tier-2 audit PASS"
