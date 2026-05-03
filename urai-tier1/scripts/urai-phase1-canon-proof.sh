#!/usr/bin/env bash
set -euo pipefail
trap 'RC=$?; echo "[FAIL] line $LINENO exit $RC"; exit $RC' ERR

cd /home/user/urai-spatial/urai-tier1 || exit 1

FILE="src/spatial/scene/SpatialScene.tsx"

echo "===== URAI PHASE 1 STRICT CANON PROOF ====="
echo

echo "1) TypeScript"
pnpm typecheck

echo
echo "2) Production build"
pnpm build --webpack

echo
echo "3) Source-level canon proof"

node <<'NODE'
const fs = require("fs");
const file = "src/spatial/scene/SpatialScene.tsx";
const s = fs.readFileSync(file, "utf8");

function pass(label) {
  console.log("[PASS] " + label);
}

function fail(label) {
  console.error("[FAIL] " + label);
  process.exit(1);
}

function has(label, needle) {
  if (!s.includes(needle)) fail(label + " missing: " + needle);
  pass(label);
}

function block(name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*useCallback\\s*\\([\\s\\S]*?\\n\\s*\\},\\s*\\[[^\\]]*\\]\\);`, "m");
  const m = s.match(re);
  if (!m) fail(name + " callback block missing");
  return m[0];
}

for (const p of ["HOME", "ASCENT", "LIFEMAP", "FOCUS", "REPLAY"]) {
  has("Phase " + p, p);
}

const beginAscent = block("beginAscent");
const openFocus = block("openFocus");
const openReplay = block("openReplay");
const escapeBack = block("escapeBack");

if (!beginAscent.includes('phase !== "HOME"')) fail("beginAscent must only allow HOME");
if (!beginAscent.includes("uraiTransitionLocked")) fail("beginAscent transition lock missing");
pass("beginAscent only-from-HOME guard exists");

if (!openFocus.includes('phase !== "LIFEMAP"')) fail("openFocus must only allow LIFEMAP");
if (!openFocus.includes("uraiTransitionLocked")) fail("openFocus transition lock missing");
pass("openFocus only-from-LIFEMAP guard exists");

if (!openReplay.includes('phase !== "FOCUS"')) fail("openReplay must only allow FOCUS");
if (!openReplay.includes("uraiTransitionLocked")) fail("openReplay transition lock missing");
if (!openReplay.includes("selectedStarId")) fail("openReplay selectedStarId guard missing");
pass("openReplay only-from-FOCUS guard exists");

if (!escapeBack.includes('phase === "ASCENT"')) fail("escapeBack ASCENT ignore missing");
if (!escapeBack.includes("REPLAY_DWELL_MS")) fail("Replay dwell lock missing");
if (!escapeBack.includes('prev === "REPLAY"')) fail("ESC REPLAY branch missing");
if (!escapeBack.includes('return "FOCUS"')) fail("ESC REPLAY -> FOCUS missing");
if (!escapeBack.includes('prev === "FOCUS"')) fail("ESC FOCUS branch missing");
if (!escapeBack.includes('return "LIFEMAP"')) fail("ESC FOCUS -> LIFEMAP missing");
if (!escapeBack.includes('prev === "LIFEMAP"')) fail("ESC LIFEMAP branch missing");
if (!escapeBack.includes('return "HOME"')) fail("ESC LIFEMAP -> HOME missing");
pass("ESC canonical unwind exists");

has("Transition lock state", "const [uraiTransitionLocked, setUraiTransitionLocked] = useState(false)");
has("Transition lock release effect", "URAI_TRANSITION_LOCK_RELEASE_SAFE");
has("ASCENT ESC ignore marker", "URAI_ASCENT_ESC_IGNORE");

console.log("");
console.log("[PASS] Source-level canon proof complete");
NODE

echo
echo "===== MANUAL RECORDING CHECKLIST ====="
cat <<'EOF'
Required proof:

1. HOME visible.
2. Click sky → ASCENT.
3. During ASCENT: spam ESC and click. No popup, no stuck state.
4. ASCENT completes → LIFEMAP.
5. Click star → FOCUS.
6. Click focus core → REPLAY.
7. ESC during Replay dwell blocks cleanly.
8. ESC after dwell: REPLAY → FOCUS.
9. ESC: FOCUS → LIFEMAP.
10. ESC: LIFEMAP → HOME.
EOF

echo
echo "[PASS] URAI Phase 1 strict canon proof complete"
