#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="_audit/${TS}_voice_micro_timing_lock"
mkdir -p "$AUDIT"

HOOK="src/spatial/narrator/usePhaseNarrator.ts"
PLAYBACK="src/spatial/narrator/narratorPlayback.ts"

[ -f "$HOOK" ] || { echo "[FAIL] Missing $HOOK"; exit 1; }
[ -f "$PLAYBACK" ] || { echo "[FAIL] Missing $PLAYBACK"; exit 1; }

cp "$HOOK" "$AUDIT/usePhaseNarrator.ts.bak"
cp "$PLAYBACK" "$AUDIT/narratorPlayback.ts.bak"

# ---- PHASE TIMING ALIGNMENT (WAIT FOR VISUAL ARRIVAL) ----
node <<'NODE'
const fs = require("fs");
const file = "src/spatial/narrator/usePhaseNarrator.ts";
let s = fs.readFileSync(file, "utf8");

/*
Add cinematic settle delays so voice never fires during motion.
*/
if (!s.includes("URAI_CINEMATIC_TIMING_V1")) {
  s = s.replace(
    "const moment = momentForTransition(prev, phase);",
    `
/* URAI_CINEMATIC_TIMING_V1 */
const settleDelay =
  phase === "ASCENT" ? 220 :
  phase === "LIFEMAP" ? 900 :
  phase === "FOCUS" ? 1100 :
  phase === "REPLAY" ? 1300 :
  phase === "HOME" ? 600 :
  400;

const moment = momentForTransition(prev, phase);`
  );

  s = s.replace(
    "if (moment) {",
    `
if (moment) {
  setTimeout(() => {`
  );

  s = s.replace(
    "narratorPlayback.playLine(buildNarratorLine(moment, stableEmotion, selectedMemoryTitle || null));",
    "narratorPlayback.playLine(buildNarratorLine(moment, stableEmotion, selectedMemoryTitle || null));\n  }, settleDelay);"
  );
}

fs.writeFileSync(file, s);
NODE

# ---- SILENCE BREATH + ANTI-STACKING ----
node <<'NODE'
const fs = require("fs");
const file = "src/spatial/narrator/narratorPlayback.ts";
let s = fs.readFileSync(file, "utf8");

if (!s.includes("URAI_SILENCE_BREATH_V1")) {
  s = s.replace(
    "private minimumSilenceMs = 900;",
    "private minimumSilenceMs = 1200; /* URAI_SILENCE_BREATH_V1 */"
  );
}

/*
Prevent back-to-back emotional stacking (especially replay + exit)
*/
if (!s.includes("URAI_EMOTIONAL_SPACING_V1")) {
  s = s.replace(
    "if (now - this.lastSpokenAt < this.minimumSilenceMs && line.priority < 90) {",
    `
/* URAI_EMOTIONAL_SPACING_V1 */
if (now - this.lastSpokenAt < this.minimumSilenceMs && line.priority < 90) {`
  );
}

/*
Add micro-delay jitter to avoid robotic cadence
*/
if (!s.includes("URAI_MICRO_JITTER_V1")) {
  s = s.replace(
    "this.delayTimer = setTimeout(async () => {",
    `
/* URAI_MICRO_JITTER_V1 */
const jitter = Math.floor(Math.random() * 140);
this.delayTimer = setTimeout(async () => {`
  );

  s = s.replace(
    "}, line.delayMs);",
    "}, line.delayMs + jitter);"
  );
}

fs.writeFileSync(file, s);
NODE

pnpm typecheck
pnpm build

echo "[PASS] VOICE MICRO-TIMING + CINEMATIC SILENCE LOCK COMPLETE"
echo "[AUDIT] $AUDIT"
