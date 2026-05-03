#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="_audit/${TS}_starfield_curve_lock"
mkdir -p "$AUDIT"

FILE="src/spatial/components/LifeMapStarfield.tsx"
[ -f "$FILE" ] || { echo "[FAIL] Missing $FILE"; exit 1; }

cp "$FILE" "$AUDIT/LifeMapStarfield.tsx.bak"

node <<'NODE'
const fs = require("fs");
const path = "src/spatial/components/LifeMapStarfield.tsx";
let s = fs.readFileSync(path, "utf8");

// inject easing if missing
if (!s.includes("easeInOut")) {
  s = s.replace(
    /const visibilityScalar\s*=\s*[\s\S]*?;/,
    match => `${match}

  const easeInOut = (x: number) => x * x * (3 - 2 * x);

  const smoothedVisibility =
    phase === "ASCENT"
      ? easeInOut(visibilityScalar)
      : visibilityScalar;`
  );
}

// replace visibility usage
s = s.replace(/visibilityScalar/g, "smoothedVisibility");

fs.writeFileSync(path, s);
NODE

echo "[PATCHED] Starfield now uses eased visibility curve"

pnpm build || { echo "[FAIL] Build failed"; exit 1; }

echo "[PASS] STARFIELD CURVE LOCK"
echo "[AUDIT] $AUDIT"
