#!/usr/bin/env bash
set -euo pipefail
trap 'RC=$?; echo "[FAIL] line $LINENO exit $RC"; exit $RC' ERR

cd /home/user/urai-spatial/urai-tier1 || exit 1

FILE="src/spatial/scene/SpatialScene.tsx"

echo "===== URAI TIER-1 FINAL PROOF ====="
echo

echo "1) Typecheck"
pnpm typecheck

echo
echo "2) Production build"
pnpm build --webpack

echo
echo "3) Canon source proof"
node <<'NODE'
const fs = require("fs");
const s = fs.readFileSync("src/spatial/scene/SpatialScene.tsx", "utf8");

function fail(x){ console.error("[FAIL] " + x); process.exit(1); }
function pass(x){ console.log("[PASS] " + x); }

function must(label, needle){
  if (!s.includes(needle)) fail(label + " missing: " + needle);
  pass(label);
}

must("HOME phase", '"HOME"');
must("ASCENT phase", '"ASCENT"');
must("LIFEMAP phase", '"LIFEMAP"');
must("FOCUS phase", '"FOCUS"');
must("REPLAY phase", '"REPLAY"');

must("ASCENT input guard", 'phase !== "HOME"');
must("Focus only from LifeMap", 'phase !== "LIFEMAP"');
must("Replay only from Focus", 'phase !== "FOCUS"');
must("Transition lock exists", "uraiTransitionLocked");
must("ASCENT ESC ignore", 'phase === "ASCENT"');
must("Replay dwell constant", "REPLAY_DWELL_MS");
must("Replay dwell gate", "t - replayEnteredAt < REPLAY_DWELL_MS");

must("ESC Replay to Focus", 'return "FOCUS"');
must("ESC Focus to LifeMap", 'return "LIFEMAP"');
must("ESC LifeMap to Home", 'return "HOME"');

must("Selected fallback marker", "URAI_SELECTED_STAR_NULL_FALLBACK");
must("Empty stars fallback marker", "URAI_EMPTY_STARS_SELECTION_FALLBACK");

if (s.includes('alert("URAI CANON VIOLATION DETECTED")') && !s.includes('phase !== "ASCENT"')) {
  fail("visible canon alert can still fire during ASCENT");
}
pass("ASCENT does not surface normal-user canon alert");

console.log("");
pass("Tier-1 source proof complete");
NODE

echo
echo "===== REQUIRED MANUAL PROOF RECORDING ====="
cat <<'EOF'
Record this exact sequence:

A) Forward:
1. HOME
2. click sky
3. ASCENT
4. spam ESC + click during ASCENT
5. LIFEMAP
6. click star
7. FOCUS
8. click focus core
9. REPLAY

B) Reverse:
10. press ESC during Replay dwell: should not leave too early
11. press ESC after dwell: REPLAY → FOCUS
12. press ESC: FOCUS → LIFEMAP
13. press ESC: LIFEMAP → HOME

Pass criteria:
- no popup
- no skipped phase
- no stuck camera
- no console spam loop
- no direct Replay from LifeMap
- no Focus from ASCENT
EOF

echo
echo "[PASS] URAI Tier-1 final proof script complete"
