#!/usr/bin/env bash
set -euo pipefail

APP="$(pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
AUD="$APP/_audit/tier1-camera-led-lock/$TS"
mkdir -p "$AUD"

# Backup originals
cp "$APP/src/spatial/scene/SpatialScene.tsx" "$AUD/SpatialScene.before.tsx"
cp "$APP/src/spatial/state/sceneStore.ts"     "$AUD/sceneStore.before.ts"
cp "$APP/src/spatial/shell/Tier1ShellConstants.ts" "$AUD/Tier1ShellConstants.before.ts"

# Patch state store
python3 - <<'PY'
from pathlib import Path
p = Path("src/spatial/state/sceneStore.ts")
s = p.read_text()
if "modeEnteredAt: number;" not in s:
    s = s.replace(
        "  selectedStarId: string | null;\n  selectedStar: SelectedStar | null;",
        "  selectedStarId: string | null;\n  modeEnteredAt: number;\n  selectedStar: SelectedStar | null;"
    )
if "modeEnteredAt: Date.now()," not in s:
    s = s.replace(
        '  selectedStarId: null,\n  selectedStar: null,',
        '  selectedStarId: null,\n  modeEnteredAt: Date.now(),\n  selectedStar: null,'
    )
s = s.replace(
    '  setMode: (mode: SceneMode) => set({ mode }),',
    '  setMode: (mode: SceneMode) => set({ mode, modeEnteredAt: Date.now() }),'
)
targets = [
    '      mode: "sky",\n',
    '      mode: star ? "focus" : "lifemap",\n',
    '      mode: "lifemap",\n',
    '      mode: "replay",\n',
    '      mode: selectedStar ? "focus" : "lifemap",\n',
]
for t in targets:
    if t + '      modeEnteredAt: Date.now(),\n' not in s:
        s = s.replace(t, t + '      modeEnteredAt: Date.now(),\n')
p.write_text(s)
PY

# Patch SpatialScene.tsx
python3 - <<'PY'
from pathlib import Path
p = Path("src/spatial/scene/SpatialScene.tsx")
text = p.read_text()

# Import prelock constants
anchor = 'import Ground from "./Ground";\n'
import_line = 'import { TIER1_CAMERA_PRELOCK, TIER1_FIELD_PRELOCK } from "../shell/Tier1ShellConstants";\n'
if import_line not in text:
    text = text.replace(anchor, anchor + import_line)

# Replace CameraRig
start = text.find("function CameraRig() {")
end   = text.find("\nfunction StarNode({", start)
new_camera = '''function CameraRig() {
  const { camera } = useThree();
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const modeEnteredAt = useSceneStore((s) => s.modeEnteredAt);
  const cameraTarget = useRef(new THREE.Vector3(0, 5.8, 30));
  const lookTarget = useRef(new THREE.Vector3(0, 2, 0));
  const desiredCamera = useRef(new THREE.Vector3(0, 5.8, 30));
  const desiredLook = useRef(new THREE.Vector3(0, 2, 0));
  useFrame((_, delta) => {
    const cp = cameraTarget.current;
    const lp = lookTarget.current;
    const dc = desiredCamera.current;
    const dl = desiredLook.current;
    const modeAge = Math.max(0, Date.now() - modeEnteredAt);
    if (mode === "home") {
      const settle = Math.min(1, modeAge / TIER1_CAMERA_PRELOCK.homeDwellMs);
      dc.set(0, 5.6 + (1 - settle) * 1.15, 29.6 - settle * 1.6);
      dl.set(0, 2.05, -0.8);
    } else if (mode === "sky") {
      dc.set(0, 8.1, 22.8);
      dl.set(0, 2.1, -12.5);
    } else if (mode === "lifemap") {
      const settle = Math.min(1, modeAge / TIER1_CAMERA_PRELOCK.focusDwellMs);
      dc.set(0, 3.55, 7.1 + (1 - settle) * 2.2);
      dl.set(0, 1.45, -18.8);
    } else if (selectedStar) {
      const [x, y, z] = selectedStar.position;
      if (mode === "focus") {
        const settle = Math.min(1, modeAge / TIER1_CAMERA_PRELOCK.focusDwellMs);
        dc.set(x * 0.18, y + 1.35 + (1 - settle) * 0.9, z + 3.85 + (1 - settle) * 1.2);
        dl.set(x, y + 0.12, z - 0.5);
      } else if (mode === "replay") {
        const settle = Math.min(1, modeAge / TIER1_CAMERA_PRELOCK.replayDwellMs);
        dc.set(x * 0.07, y + 0.78 + (1 - settle) * 0.55, z + 2.05 + (1 - settle) * 0.7);
        dl.set(x, y + 0.16, z - 1.1);
      } else {
        dc.set(x * 0.12, y + 1.55, z + 5.0);
        dl.set(x, y + 0.08, z - 0.5);
      }
    }
    const ease = Math.max(0.02, Math.min(0.22, TIER1_CAMERA_PRELOCK.ease));
    const t = 1 - Math.pow(1 - ease, delta * 60);
    cp.lerp(dc, t);
    lp.lerp(dl, t * 0.92);
    camera.position.copy(cp);
    camera.lookAt(lp);
  });
  return null;
}'''
text = text[:start] + new_camera + text[end:]

# Inline replacements for readability/scale tweaks
pairs = {
    '        <sphereGeometry args={[mode === "lifemap" ? star.size * 0.36 : star.size * 0.22, 18, 18]} />':
    '        <sphereGeometry args={[mode === "lifemap" ? star.size * 0.52 * TIER1_FIELD_PRELOCK.readabilityBias : star.size * 0.34 * TIER1_FIELD_PRELOCK.readabilityBias, 20, 20]} />',
    '          emissiveIntensity={isSelected ? (mode === "focus" ? 4.4 : 3.2) : dimmed ? 0.5 : mode === "lifemap" ? star.intensity * 2.2 : star.intensity * 1.4}':
    '          emissiveIntensity={isSelected ? (mode === "focus" ? 5.2 : 3.8) : dimmed ? 0.42 : mode === "lifemap" ? star.intensity * 2.85 : star.intensity * 1.75}',
    '          opacity={dimmed ? 0.32 : mode === "lifemap" ? 0.98 : 0.98}':
    '          opacity={dimmed ? 0.24 : 0.99}',
    '        <sphereGeometry args={[mode === "lifemap" ? star.size * 0.58 : star.size * 0.38, 18, 18]} />':
    '        <sphereGeometry args={[mode === "lifemap" ? star.size * 0.82 * TIER1_FIELD_PRELOCK.readabilityBias : star.size * 0.56 * TIER1_FIELD_PRELOCK.readabilityBias, 20, 20]} />',
    '          opacity={isSelected ? (mode === "focus" ? 0.32 : 0.22) : dimmed ? 0.03 : mode === "lifemap" ? 0.10 : 0.06}':
    '          opacity={isSelected ? (mode === "focus" ? 0.36 : 0.24) : dimmed ? 0.02 : mode === "lifemap" ? 0.14 : 0.08}',
    '    const base = mode === "replay" ? 1.5 : 1.18;':
    '    const base = mode === "replay" ? 1.9 : mode === "focus" ? 1.42 : 1.18;',
    '        <sphereGeometry args={[selectedStar.size * 0.72, 32, 32]} />':
    '        <sphereGeometry args={[selectedStar.size * (mode === "replay" ? 1.18 : 0.92), 32, 32]} />',
    '          emissiveIntensity={mode === "replay" ? 0.65 : mode === "focus" ? 0.52 : 0.35}':
    '          emissiveIntensity={mode === "replay" ? 0.82 : mode === "focus" ? 0.64 : 0.4}',
    '          opacity={mode === "replay" ? 0.18 : mode === "focus" ? 0.14 : 0.09}':
    '          opacity={mode === "replay" ? 0.24 : mode === "focus" ? 0.18 : 0.10}',
    '          const ambientCount = mode === "lifemap" ? 460 : mode === "sky" ? 70 : 28;':
    '          const ambientCount = mode === "lifemap" ? 220 : mode === "sky" ? 64 : 24;',
    '                                        const radius = mode === "lifemap" ? 6 + (i % 17) * 1.75 + Math.sin(i * 0.77) * 1.1 : mode === "sky" ? 18 + (i % 15) * 3.8 + Math.sin(i * 0.77) * 2.2 : 26 + (i % 13) * 5.2 + Math.sin(i * 0.77) * 2.6;':
    '                                        const radius = mode === "lifemap" ? 4.8 + (i % 15) * 1.25 + Math.sin(i * 0.77) * 0.82 : mode === "sky" ? 18 + (i % 15) * 3.8 + Math.sin(i * 0.77) * 2.2 : 26 + (i % 13) * 5.2 + Math.sin(i * 0.77) * 2.6;',
    '                                        const y = mode === "lifemap" ? -2.5 + (i % 29) * 0.44 + Math.sin(i * 1.13) * 0.95 : mode === "sky" ? -7 + (i % 23) * 0.72 + Math.sin(i * 1.13) * 1.4 : -10 + (i % 19) * 0.9 + Math.sin(i * 1.13) * 1.6;':
    '                                        const y = mode === "lifemap" ? -1.6 + (i % 24) * 0.36 + Math.sin(i * 1.13) * 0.7 : mode === "sky" ? -7 + (i % 23) * 0.72 + Math.sin(i * 1.13) * 1.4 : -10 + (i % 19) * 0.9 + Math.sin(i * 1.13) * 1.6;',
    '                                        const z = mode === "lifemap" ? -12 - (i % 23) * 2.9 - Math.cos(i * 0.41) * 1.8 : mode === "sky" ? -22 - (i % 21) * 4.8 - Math.cos(i * 0.41) * 3.0 : -36 - (i % 17) * 6.0 - Math.cos(i * 0.41) * 3.6;':
    '                                        const z = mode === "lifemap" ? -9.5 - (i % 18) * 2.15 - Math.cos(i * 0.41) * 1.2 : mode === "sky" ? -22 - (i % 21) * 4.8 - Math.cos(i * 0.41) * 3.0 : -36 - (i % 17) * 6.0 - Math.cos(i * 0.41) * 3.6;',
    '? 0.58': '? 0.42',
    '? 0.74': '? 0.66',
    '? 1.55': '? 1.72',
    ': 1.25;': ': 1.38;'
}
for old, new in pairs.items():
    text = text.replace(old, new)
p.write_text(text)
PY

# Ensure dependencies and run build
[ -d node_modules ] || pnpm install
pnpm build

echo "Tier1 camera-led lock applied. Backups are stored in $AUD"
