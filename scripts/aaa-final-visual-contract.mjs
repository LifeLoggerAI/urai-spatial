import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = process.cwd();
const outDir = process.env.OUT || join(root, 'docs');
const outPath = join(outDir, 'aaa-final-visual-contract-report.md');
const checks = [];

function read(path) {
  const full = join(root, path);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

function mustExist(surface, path, label) {
  checks.push({ surface, path, label, ok: existsSync(join(root, path)) });
}

function mustInclude(surface, path, label, text) {
  const ok = read(path).includes(text);
  checks.push({ surface, path, label, ok });
}

for (const [surface, path] of [
  ['root', 'urai-tier1/src/app/page.tsx'],
  ['home-wrapper', 'urai-tier1/src/app/FinalHomeThreshold.tsx'],
  ['home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx'],
  ['ground', 'urai-tier1/src/app/ground/page.tsx'],
  ['life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx'],
  ['focus-replay', 'urai-tier1/src/app/FinalMemorySurfaces.tsx'],
  ['mirror', 'urai-tier1/src/app/mirror/page.tsx'],
  ['passport', 'urai-tier1/src/app/FinalPassportVault.tsx'],
  ['status', 'urai-tier1/src/app/status/page.tsx'],
  ['privacy', 'urai-tier1/src/app/privacy-controls/page.tsx'],
  ['location', 'urai-tier1/src/app/location-map/page.tsx'],
  ['xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx'],
]) mustExist(surface, path, 'source present');

mustInclude('root', 'urai-tier1/src/app/page.tsx', '/ route renders final Home threshold', 'FinalHomeThreshold');
mustInclude('home-wrapper', 'urai-tier1/src/app/FinalHomeThreshold.tsx', 'Home wrapper renders final Home world', 'HomeSpatialWorldFinal');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'final Home world owner', 'HomeSpatialWorldFinal');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'sky/ground/orb/body marker', 'aaa-final-home-sky-ground-orb-body-portals');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'ground descent link', '/ground?from=home');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'sky ascent link', '/life-map?from=home-sky');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'sky click instruction', 'Click the sky');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'Life Map camera ascent copy', 'Camera ascends into your Life Map');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'avatar and orb stay anchored', 'Avatar and orb stay anchored in Home/Ground');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'delayed cinematic sky navigation', 'HOME_CAMERA_ASCENT_MS');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'threshold navigation handler', 'navigateThroughThreshold');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'ascent signal markup', 'urai-genesis-home__camera-ascent-signal');
mustInclude('home', 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx', 'orb companion opens in place', 'Open URAI orb companion');

mustInclude('ground', 'urai-tier1/src/app/ground/page.tsx', 'embodied Ground marker', 'premium-embodied-ground-world');
mustInclude('ground', 'urai-tier1/src/app/ground/page.tsx', 'private workforce present', 'Welcome Guide');
mustInclude('ground', 'urai-tier1/src/app/ground/page.tsx', 'privacy sanctuary present', 'Privacy sanctuary');
mustInclude('ground', 'urai-tier1/src/app/ground/page.tsx', 'objects are inspectable', '<details');
mustInclude('ground', 'urai-tier1/src/app/ground/page.tsx', 'mobile proof tray exists', 'Mobile Ground World proof tray');

mustInclude('life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx', 'true 3D marker', 'urai-true-3d-life-map');
mustInclude('life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx', 'R3F canvas active', '<Canvas');
mustInclude('life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx', 'image-textured memory stars', 'createMemoryTexture');
mustInclude('life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx', 'selected star camera move', 'cameraForNode');
mustInclude('life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx', 'Focus route opens from star', '/focus?memoryId=');
mustInclude('life-map', 'urai-tier1/src/components/lifemap/LifeMapScene.tsx', 'Replay route opens from star', '/replay?memoryId=');

mustInclude('focus', 'urai-tier1/src/app/FinalMemorySurfaces.tsx', 'selected memory camera chamber marker', 'selected-memory-camera-chamber');
mustInclude('focus', 'urai-tier1/src/app/FinalMemorySurfaces.tsx', 'Replay doorway exists', 'Camera into Replay');
mustInclude('replay', 'urai-tier1/src/app/FinalMemorySurfaces.tsx', 'cinematic memory film marker', 'cinematic-memory-camera-film');
mustInclude('replay', 'urai-tier1/src/app/FinalMemorySurfaces.tsx', 'film beat list exists', 'Film beats');

mustInclude('mirror', 'urai-tier1/src/app/mirror/page.tsx', 'reflection realm marker', 'reflection-realm');
mustInclude('mirror', 'urai-tier1/src/app/mirror/page.tsx', 'pattern intelligence visible', 'Pattern intelligence');
mustInclude('passport', 'urai-tier1/src/app/FinalPassportVault.tsx', 'identity consent vault marker', 'identity-consent-vault');
mustInclude('passport', 'urai-tier1/src/app/FinalPassportVault.tsx', 'provenance layer present', 'Provenance');
mustInclude('status', 'urai-tier1/src/app/status/page.tsx', 'status control room marker', 'premium-status-control-room');
mustInclude('privacy', 'urai-tier1/src/app/privacy-controls/page.tsx', 'privacy console marker', 'premium-privacy-consent-console');
mustInclude('location', 'urai-tier1/src/app/location-map/page.tsx', 'emotional weather marker', 'premium-emotional-weather-atlas');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'Quest manual proof boundary', 'manual-device-required');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'Enter VR button present', 'QuestVrEntryButton');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'Quest chamber live badge', 'QUEST CHAMBER LIVE');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'huge orb chamber copy', 'a huge orb in front');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'Life Map chamber door', 'Life Map opens ahead');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'Ground chamber door', 'Ground below you');
mustInclude('xr', 'urai-tier1/src/app/spatial/ar-vr/page.tsx', 'manual visual confirmation checklist', 'Confirm the huge orb, Life Map door, and Ground door are visible');

for (const [label, path] of [
  ['home asset', 'urai-tier1/public/assets/urai/home/home-threshold-main.webp'],
  ['ground asset', 'urai-tier1/public/assets/urai/ground/ground-world-main.webp'],
  ['life map asset', 'urai-tier1/public/assets/urai/life-map/life-map-galaxy-main.webp'],
  ['focus asset', 'urai-tier1/public/assets/urai/focus/focus-memory-chamber-main.webp'],
  ['replay asset', 'urai-tier1/public/assets/urai/replay/replay-memory-film-main.webp'],
  ['mirror asset', 'urai-tier1/public/assets/urai/mirror/mirror-reflection-main.webp'],
  ['passport asset', 'urai-tier1/public/assets/urai/passport/passport-vault-main.webp'],
  ['status asset', 'urai-tier1/public/assets/urai/status/status-route-matrix-main.webp'],
  ['XR proof frame', 'urai-tier1/public/assets/urai/launch/quest-xr-proof-frame.svg'],
]) mustExist('assets', path, label);

mustInclude('css', 'urai-tier1/src/app/aaa-launch-proof-layer.css', 'Focus polish selector matches current marker', 'selected-memory-camera-chamber');
mustInclude('css', 'urai-tier1/src/app/aaa-launch-proof-layer.css', 'Replay polish selector matches current marker', 'cinematic-memory-camera-film');
mustInclude('css', 'urai-tier1/src/app/urai-canon-camera-transitions.css', 'Home sky ascent signal styled', 'urai-genesis-home__camera-ascent-signal');
mustInclude('css', 'urai-tier1/src/app/urai-canon-camera-transitions.css', 'Home sky ascent keyframe exists', 'uraiCanonHomeAscendToLifeMap');
mustInclude('css', 'urai-tier1/src/app/urai-canon-camera-transitions.css', 'Home sky gate ignition exists', 'uraiCanonSkyGateIgnites');

const failures = checks.filter((check) => !check.ok);
const lines = [
  '# URAI AAA Final Visual Contract Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Result: ${failures.length === 0 ? 'GREEN' : 'RED'}`,
  `Checks: ${checks.length}`,
  `Failures: ${failures.length}`,
  '',
  'This guard catches route-owner drift, missing proof assets, route-chain regressions, Home sky-ascent drift, and false Quest proof language before launch.',
  '',
  '| State | Surface | Check | File |',
  '| --- | --- | --- | --- |',
  ...checks.map((check) => `| ${check.ok ? 'PASS' : 'FAIL'} | ${check.surface} | ${check.label} | ${check.path} |`),
  '',
];
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'));
for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.surface} :: ${check.label}`);
console.log(`AAA_FINAL_VISUAL_CONTRACT=${failures.length === 0 ? 'GREEN' : 'RED'}`);
console.log(`AAA_FINAL_VISUAL_CHECKS=${checks.length}`);
console.log(`AAA_FINAL_VISUAL_FAILURES=${failures.length}`);
console.log(`AAA_FINAL_VISUAL_REPORT=${outPath}`);
if (failures.length) process.exitCode = 1;
