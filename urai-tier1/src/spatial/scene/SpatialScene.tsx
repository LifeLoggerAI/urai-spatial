cd ~/urai-spatial/urai-tier1

cat > /tmp/urai_lifemap_final_lock.sh <<'BASH'
#!/usr/bin/env bash
set -euo pipefail

TS="$(date +%Y%m%d_%H%M%S)"
AUDIT="_audit/${TS}_lifemap_final_lock"
mkdir -p "$AUDIT"

SCENE="src/spatial/scene/SpatialScene.tsx"
CAMERA="src/spatial/components/CinematicCameraRig.tsx"
STARS="src/spatial/components/LifeMapStarfield.tsx"

for f in "$SCENE" "$CAMERA" "$STARS"; do
  [ -f "$f" ] || { echo "[FAIL] Missing $f"; exit 1; }
  cp "$f" "$AUDIT/$(basename "$f").before"
done

echo "[CHECK] Merge conflicts"
if grep -R "<<<<<<<\|=======\|>>>>>>>" src/spatial; then
  echo "[FAIL] Merge conflict markers still exist. Resolve them before final lock."
  exit 1
fi

node <<'NODE'
const fs = require("fs");

function fail(msg) {
  console.error("[FAIL]", msg);
  process.exit(1);
}

function write(file, text) {
  fs.writeFileSync(file, text);
}

/* =========================
   CAMERA FIX: NO TOP-DOWN
   ========================= */

const cameraFile = "src/spatial/components/CinematicCameraRig.tsx";
let cam = fs.readFileSync(cameraFile, "utf8");

if (!cam.includes("LIFEMAP")) fail("No LIFEMAP camera block found");

cam = cam.replace(
  /case\s+["']LIFEMAP["']\s*:\s*\{[\s\S]*?break;\s*\}/,
  `case "LIFEMAP": {
      // Final lock: forward-facing arrival, never top-down.
      targetPos.set(0, 1.8, 6.5);
      targetLook.set(0, 1.2, -6.5);
      fovTarget = 48;
      break;
    }`
);

write(cameraFile, cam);
console.log("[OK] Camera LIFEMAP forward-facing lock");

/* =========================
   ASCENT -> LIFEMAP SOFTENING
   idempotent / no repeated nesting
   ========================= */

const sceneFile = "src/spatial/scene/SpatialScene.tsx";
let scene = fs.readFileSync(sceneFile, "utf8");

if (!scene.includes("ASCENT")) fail("No ASCENT logic found");

if (!scene.includes("URAI_LIFEMAP_SOFT_TRANSITION_LOCK")) {
  scene = scene.replace(
    /setPhase\(["']LIFEMAP["']\);?/g,
    `// URAI_LIFEMAP_SOFT_TRANSITION_LOCK
      window.setTimeout(() => setPhase("LIFEMAP"), 80);`
  );
}

write(sceneFile, scene);
console.log("[OK] LIFEMAP transition softened");

/* =========================
   STARFIELD DEPTH + SCALE
   idempotent
   ========================= */

const starsFile = "src/spatial/components/LifeMapStarfield.tsx";
let stars = fs.readFileSync(starsFile, "utf8");

if (!stars.includes("<mesh")) fail("Starfield mesh structure not detected");

if (!stars.includes("URAI_STAR_DEPTH_LOCK")) {
  stars = stars.replace(
    /position=\{\[([^\]]+)\]\}/g,
    (match, coords) => {
      const parts = coords.split(",").map((p) => p.trim());
      if (parts.length !== 3) return match;
      return `position={[${parts[0]}, ${parts[1]}, (${parts[2]}) - 8]} /* URAI_STAR_DEPTH_LOCK */`;
    }
  );

  stars = stars.replace(
    /scale=\{([0-9.]+)\}/g,
    (match, raw) => {
      const val = Number.parseFloat(raw);
      if (!Number.isFinite(val)) return match;
      return `scale={${(val * 0.85).toFixed(4)}}`;
    }
  );
}

write(starsFile, stars);
console.log("[OK] Star depth + scale normalized");

/* =========================
   CLICK TARGET FIX
   idempotent
   ========================= */

stars = fs.readFileSync(starsFile, "utf8");

if (!stars.includes("URAI_STAR_SELECT")) {
  stars = stars.replace(
    /<mesh\b/g,
    `<mesh
      onClick={(e) => {
        e.stopPropagation();
        if (typeof window !== "undefined" && window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent("URAI_STAR_SELECT", {
              detail: e.object.uuid,
            })
          );
        }
      }}`
  );

  write(starsFile, stars);
  console.log("[OK] Star click targeting added");
} else {
  console.log("[INFO] Star click targeting already exists");
}
NODE

echo "[TYPECHECK]"
pnpm typecheck

echo "[BUILD]"
pnpm build

echo "[PASS] LIFEMAP FINAL LOCK COMPLETE"
echo "[AUDIT] $AUDIT"
BASH

bash /tmp/urai_lifemap_final_lock.sh