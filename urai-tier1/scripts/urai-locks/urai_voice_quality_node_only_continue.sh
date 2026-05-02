#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="_audit/${TS}_voice_quality_node_only_continue"
mkdir -p "$AUDIT"

PLAYBACK="src/spatial/narrator/narratorPlayback.ts"
COPY="src/spatial/narrator/narratorCopy.ts"

[ -f "$PLAYBACK" ] || { echo "[FAIL] Missing $PLAYBACK"; exit 1; }
[ -f "$COPY" ] || { echo "[FAIL] Missing $COPY"; exit 1; }

cp "$PLAYBACK" "$AUDIT/narratorPlayback.ts.bak"
cp "$COPY" "$AUDIT/narratorCopy.ts.bak"

node <<'NODE'
const fs = require("fs");
const file = "src/spatial/narrator/narratorPlayback.ts";
let s = fs.readFileSync(file, "utf8");

if (!s.includes("private recentIds: string[] = []")) {
  s = s.replace(
    'private lastSpokenId = "";',
    'private lastSpokenId = "";\n  private recentIds: string[] = [];\n  private minimumSilenceMs = 900;'
  );
}

s = s.replace(
`if (this.lastSpokenId === line.id && now - this.lastSpokenAt < 2200) {
      console.info("[NARRATOR] blocked duplicate:", line.id);
      return;
    }`,
`if (this.lastSpokenId === line.id && now - this.lastSpokenAt < 2600) {
      console.info("[NARRATOR] blocked duplicate:", line.id);
      return;
    }

    if (this.recentIds.includes(line.id)) {
      console.info("[NARRATOR] blocked recent repeat:", line.id);
      return;
    }

    if (now - this.lastSpokenAt < this.minimumSilenceMs && line.priority < 90) {
      console.info("[NARRATOR] blocked silence window:", line.id);
      return;
    }`
);

s = s.replace(
`this.lastSpokenId = line.id;
    this.lastSpokenAt = now;`,
`this.lastSpokenId = line.id;
    this.lastSpokenAt = now;
    this.recentIds.push(line.id);
    while (this.recentIds.length > 8) this.recentIds.shift();`
);

fs.writeFileSync(file, s);
NODE

pnpm typecheck
pnpm build

echo "[PASS] VOICE PERSONALITY + QUALITY LOCK COMPLETE"
echo "[AUDIT] $AUDIT"
