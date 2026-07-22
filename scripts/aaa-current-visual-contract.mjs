import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = process.cwd()
const report = join(process.env.OUT || join(root, 'docs'), 'aaa-final-visual-contract-report.md')
const results = []
const hasFile = (file) => existsSync(join(root, file))
const hasText = (file, token) => hasFile(file) && readFileSync(join(root, file), 'utf8').includes(token)
const check = (surface, file, label, token) => results.push({ surface, file, label, ok: token ? hasText(file, token) : hasFile(file) })

const files = {
  root: 'urai-tier1/src/app/page.tsx',
  homeWrapper: 'urai-tier1/src/app/FinalHomeThreshold.tsx',
  home: 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx',
  ground: 'urai-tier1/src/app/GroundSpatialWorldClean.tsx',
  locationMapPage: 'urai-tier1/src/app/location-map/page.tsx',
  locationMapScene: 'urai-tier1/src/spatial/places/LocationMapScene.tsx',
  memory: 'urai-tier1/src/app/FinalMemorySurfaces.tsx',
  mirror: 'urai-tier1/src/app/mirror/page.tsx',
  passport: 'urai-tier1/src/app/FinalPassportVault.tsx',
  status: 'urai-tier1/src/app/status/page.tsx',
  privacy: 'urai-tier1/src/app/privacy-controls/ConsentSanctuaryClient.tsx',
  xr: 'urai-tier1/src/app/spatial/ar-vr/page.tsx',
  notFound: 'urai-tier1/src/pages/404.tsx',
}

for (const [surface, file] of Object.entries(files)) check(surface, file, 'source present')

const sourceChecks = [
  ['root', 'root', 'Home threshold owner', 'FinalHomeThreshold'],
  ['home', 'homeWrapper', 'final Home wrapper', 'urai-home-accessible-fallback'],
  ['home', 'home', 'Home launch marker', 'data-launch-surface="aaa-final-home-sky-ground-orb-body-portals"'],
  ['home', 'home', 'Ground threshold', '/ground?from=home'],
  ['home', 'home', 'Life Map threshold', '/life-map?from=home-sky'],
  ['home', 'home', 'Own your life copy', 'Own your life.'],
  ['home', 'home', 'Threshold online copy', 'Threshold online'],
  ['ground', 'ground', 'embodied Ground', 'urai-ground-private-workforce-world'],
  ['ground', 'ground', 'walkable Ground', 'walkable'],
  ['ground', 'ground', 'private workforce', 'Private infrastructure, embodied.'],
  ['ground', 'ground', 'mobile proof tray', 'MovementHelp'],
  ['location-map', 'locationMapPage', 'atlas owner', 'premium-emotional-weather-atlas'],
  ['location-map', 'locationMapScene', 'atlas scene', 'LocationMapScene'],
  ['location-map', 'locationMapScene', 'privacy labels', 'Exact location kept private'],
  ['memory', 'memory', 'Focus route', '/focus?memoryId=quiet-reset'],
  ['memory', 'memory', 'Replay route', '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread'],
  ['memory', 'memory', 'Focus beats', 'Camera enters star'],
  ['memory', 'memory', 'Replay beats', 'Body return'],
  ['mirror', 'mirror', 'Mirror realm', 'data-testid="urai-final-mirror-realm"'],
  ['passport', 'passport', 'Passport vault', 'data-testid="urai-final-passport-vault"'],
  ['passport', 'passport', 'ownership copy', 'Your life stays yours.'],
  ['status', 'status', 'Status room', 'data-testid="urai-final-status-control-room"'],
  ['status', 'status', 'Status launch surface', 'premium-status-control-room'],
  ['privacy', 'privacy', 'Privacy sanctuary', 'Opening the Consent Sanctuary…'],
  ['privacy', 'privacy', 'Privacy launch surface', 'premium-privacy-consent-console'],
  ['xr', 'xr', 'manual proof boundary', 'URAI AR / VR / XR entry chamber'],
  ['xr', 'xr', 'XR entry route', 'UraiQuestEntryWorldV2'],
  ['not-found', 'notFound', 'static export shim', 'PagesRouterNotFoundShim'],
]
for (const [surface, key, label, token] of sourceChecks) check(surface, files[key], label, token)

for (const [label, file] of [
  ['Home asset', 'urai-tier1/public/assets/urai/home/home-threshold-main.webp'],
  ['Ground asset', 'urai-tier1/public/assets/urai/ground/ground-world-main.webp'],
  ['Life Map asset', 'urai-tier1/public/assets/urai/life-map/life-map-galaxy-main.webp'],
  ['Focus asset', 'urai-tier1/public/assets/urai/focus/focus-memory-chamber-main.webp'],
  ['Replay asset', 'urai-tier1/public/assets/urai/replay/replay-memory-film-main.webp'],
  ['Mirror asset', 'urai-tier1/public/assets/urai/mirror/mirror-reflection-main.webp'],
  ['Passport asset', 'urai-tier1/public/assets/urai/passport/passport-vault-main.webp'],
  ['Status asset', 'urai-tier1/public/assets/urai/status/status-route-matrix-main.webp'],
  ['XR proof frame', 'urai-tier1/public/assets/urai/launch/quest-xr-proof-frame.svg'],
]) check('assets', file, label)

for (const [label, file, token] of [
  ['Focus selector', 'urai-tier1/src/app/aaa-launch-proof-layer.css', 'selected-memory-camera-chamber'],
  ['Replay selector', 'urai-tier1/src/app/aaa-launch-proof-layer.css', 'cinematic-memory-camera-film'],
  ['Home ascent transition', 'urai-tier1/src/app/urai-canon-camera-transitions.css', 'uraiCanonHomeAscendToLifeMap'],
]) check('css', file, label, token)

const failed = results.filter((result) => !result.ok)
const rows = results.map((result) => `| ${result.ok ? 'PASS' : 'FAIL'} | ${result.surface} | ${result.label} | ${result.file} |`)
mkdirSync(dirname(report), { recursive: true })
writeFileSync(report, ['# URAI AAA Final Visual Contract Report', '', `Generated: ${new Date().toISOString()}`, `Result: ${failed.length ? 'RED' : 'GREEN'}`, `Checks: ${results.length}`, `Failures: ${failed.length}`, '', '| State | Surface | Check | File |', '| --- | --- | --- | --- |', ...rows, ''].join('\n'))
for (const result of results) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${result.surface} :: ${result.label}`)
console.log(`AAA_FINAL_VISUAL_CONTRACT=${failed.length ? 'RED' : 'GREEN'}`)
console.log(`AAA_FINAL_VISUAL_CHECKS=${results.length}`)
console.log(`AAA_FINAL_VISUAL_FAILURES=${failed.length}`)
console.log(`AAA_FINAL_VISUAL_REPORT=${report}`)
if (failed.length) process.exitCode = 1
