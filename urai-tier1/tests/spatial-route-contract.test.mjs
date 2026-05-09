import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativeCandidates) {
  for (const relativePath of relativeCandidates) {
    const absolutePath = path.join(root, relativePath)
    if (fs.existsSync(absolutePath)) return fs.readFileSync(absolutePath, 'utf8')
  }

  assert.fail(`missing expected file: ${relativeCandidates.join(', ')}`)
}

function flat(source) {
  return source.replace(/\s+/g, ' ')
}

function compact(source) {
  return source.replace(/\s+/g, '')
}

const files = {
  home: read(['src/app/page.tsx']),
  homeRoute: read(['src/app/home/page.tsx']),
  ascent: read(['src/app/ascent/page.tsx']),
  lifeMap: read(['src/app/life-map/page.tsx']),
  focus: read(['src/app/focus/page.tsx']),
  replay: read(['src/app/replay/page.tsx']),
  mirror: read(['src/app/mirror/page.tsx']),
  tierOne: read(['src/spatial/layout/TierOneExperience.tsx']),
  sceneRaw: read(['src/scene/HomeScene.tsx']),
  focusStateRaw: read(['src/spatial/scene/focusState.ts']),
  overlayRaw: read(['src/scene/SpatialVisualOverlayPremium.tsx', 'src/scene/SpatialVisualOverlayTier5.tsx']),
  css: read(['src/app/globals.css']),
  rules: read(['../firebase/firestore.rules', 'firebase/firestore.rules']),
  rendererRaw: read(['src/spatial/assets/ManifestRenderer.tsx']),
  manifestsRaw: read(['src/spatial/constellation/useConstellationManifests.ts']),
}

const scene = flat(files.sceneRaw)
const focusState = flat(files.focusStateRaw)
const tierOne = flat(files.tierOne)
const overlay = flat(files.overlayRaw)
const rules = flat(files.rules)
const renderer = flat(files.rendererRaw)
const manifests = flat(files.manifestsRaw)

test('primary routes use the canonical TierOneExperience shell', () => {
  assert.match(compact(files.home), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(files.homeRoute), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(files.ascent), /<TierOneExperiencemode="ascent"\/>/)
  assert.match(compact(files.lifeMap), /<TierOneExperiencemode="life-map"\/>/)
  assert.match(compact(files.focus), /<TierOneExperiencemode="focus"\/>/)
  assert.match(compact(files.replay), /<TierOneExperiencemode="replay"\/>/)
  assert.match(compact(files.mirror), /<TierOneExperiencemode="mirror"\/>/)
})

test('TierOneExperience maps routed modes to the canonical HomeScene shell', () => {
  assert.match(
    tierOne,
    /export type TierOneExperienceMode = "home" \| "ascent" \| "life-map" \| "demo" \| "replay" \| "focus" \| "unwind" \| "mirror"/,
  )
  assert.match(tierOne, /if \(mode === "replay"\) return "replay" as const/)
  assert.match(tierOne, /if \(mode === "focus" \|\| mode === "mirror" \|\| mode === "unwind"\) return "detail" as const/)
  assert.match(tierOne, /if \(mode === "ascent" \|\| mode === "life-map"\) return "sky" as const/)
  assert.match(tierOne, /<HomeScene sceneMode=\{mode\} \/>/)
})

test('HomeScene preserves silent home and spatial route authority', () => {
  assert.match(scene, /import SpatialVisualOverlay from '\.\/SpatialVisualOverlayPremium'/)
  assert.match(scene, /type SceneMode = 'home' \| 'ascent' \| 'life-map' \| 'demo' \| 'replay' \| 'focus' \| 'unwind' \| 'mirror'/)
  assert.match(scene, /const ASCENT_DURATION_MS = 1800/)
  assert.match(scene, /const isHomeMode = sceneMode === 'home'/)
  assert.match(scene, /const isAscentMode = sceneMode === 'ascent'/)
  assert.match(scene, /const isConstellationRoute = sceneMode === 'life-map' \|\| sceneMode === 'demo' \|\| params\.get\('mode'\) === 'constellation'/)
  assert.match(scene, /const showHomeWorld = isHomeMode/)
  assert.match(scene, /const showAscentPortal = isAscentMode/)
  assert.match(scene, /const showConstellation = isConstellationRoute && !gateBlocksMode/)
  assert.match(scene, /const showOrb = sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror' \|\| sceneMode === 'unwind'/)
  assert.match(scene, /if \(silentHomeInvariantProof\(mode\) === null\) return null/)
  assert.match(scene, /onClick=\{isHomeMode \? enterLifeMap : undefined\}/)
  assert.ok(scene.includes('{showHomeWorld ? <Ground /> : null}'))
  assert.ok(scene.includes('{showAscentPortal ? <AscentPortal /> : null}'))
  assert.ok(scene.includes('{showOrb ? <Orb state={orbState} /> : null}'))
  assert.ok(scene.includes('ConstellationLayer enabled'))
  assert.ok(scene.includes('ManifestRenderBoundary manifest={activeManifest}'))
  assert.doesNotMatch(scene, /data-testid="urai-sky-click-target"/)
  assert.doesNotMatch(scene, /aria-label="Begin ascent to Life Map"/)
  assert.doesNotMatch(scene, /data-testid="urai-sky-guidance"/)
  assert.doesNotMatch(scene, /const showOrb = isHomeMode/)
  assert.doesNotMatch(scene, /\|\| !manifestId/)
})

test('HomeScene routes Home to Ascent to Life Map and supports focus replay unwind', () => {
  assert.match(scene, /if \(sceneMode === 'home'\) router\.push\('\/ascent'\)/)
  assert.match(scene, /if \(sceneMode === 'ascent'\) router\.push\('\/life-map'\)/)
  assert.match(scene, /data-testid="urai-scene-stage"/)
  assert.match(scene, /data-testid="urai-ascent-guidance"/)
  assert.match(scene, /Ascending into your Life Map/)
  assert.match(scene, /if \(!isAscentMode \|\| reducedMotion\) return/)
  assert.match(scene, /window\.setTimeout\(\(\) => router\.push\('\/life-map'\), ASCENT_DURATION_MS\)/)
  assert.match(scene, /data-testid="urai-lifemap-guidance"/)
  assert.match(scene, /Click a star to open memory focus/)
  assert.match(scene, /router\.push\(`\/focus\?manifestId=\$\{encodeURIComponent\(manifest\.manifestId\)\}`\)/)
  assert.match(scene, /router\.push\(manifestReplayHref\(activeManifestId\)\)/)
  assert.match(scene, /if \(event\.key === 'Escape'\) unwind\(\)/)
  assert.match(scene, /if \(event\.key\.toLowerCase\(\) === 'r' && !isHomeMode\) resetCamera\(\)/)
  assert.match(scene, /if \(sceneMode === 'replay'\)/)
  assert.match(scene, /router\.push\(manifestFocusHref\(activeManifestId\)\)/)
  assert.match(scene, /if \(sceneMode === 'focus'\)/)
  assert.match(scene, /router\.push\('\/life-map'\)/)
  assert.match(scene, /if \(sceneMode === 'unwind'\)/)
  assert.match(scene, /router\.push\('\/'\)/)
  assert.match(scene, /if \(sceneMode === 'life-map' \|\| sceneMode === 'ascent'\)/)
  assert.doesNotMatch(scene, /router\.push\('\/home'\)/)
})

test('Focus phase model is explicit and wired into HomeScene', () => {
  assert.match(focusState, /export type FocusPhase =/)
  assert.match(focusState, /'loading_focus_data'/)
  assert.match(focusState, /'focus_ready'/)
  assert.match(focusState, /'focus_detail_open'/)
  assert.match(focusState, /'focus_empty'/)
  assert.match(focusState, /'focus_error'/)
  assert.match(focusState, /export function resolveFocusPhase\(input: FocusPhaseInput\): FocusPhase/)
  assert.match(focusState, /if \(input\.mode !== 'focus' && input\.mode !== 'replay'\) return 'idle'/)
  assert.match(focusState, /if \(input\.isGateBlocked && !input\.isGateLoading\) return 'focus_error'/)
  assert.match(focusState, /if \(input\.isGateLoading \|\| \(input\.isManifestLoading && !input\.hasLoadedTarget\)\) return 'loading_focus_data'/)
  assert.match(focusState, /if \(input\.isReplayLaunching\) return 'exiting_focus'/)
  assert.match(scene, /import \{ FocusPhaseDefinition, getFocusPhaseDefinition, resolveFocusPhase \} from '\.\.\/spatial\/scene\/focusState'/)
  assert.match(scene, /const focusPhase = useMemo\(/)
  assert.match(scene, /resolveFocusPhase\(\{/)
  assert.match(scene, /const focusDefinition = useMemo\(\(\) => getFocusPhaseDefinition\(focusPhase\), \[focusPhase\]\)/)
  assert.match(scene, /data-focus-phase=\{focusPhase\}/)
  assert.match(scene, /focusDefinition\.allowedActions\.includes\('start_replay'\)/)
  assert.match(scene, /focusDefinition\.userVisibleUi/)
})

test('focus and replay use demo fallback instead of unavailable error copy', () => {
  assert.match(scene, /function FocusEmptyPanel/)
  assert.match(scene, /data-testid="urai-focus-empty-panel"/)
  assert.match(scene, /const modeNeedsManifest = sceneMode === 'focus' \|\| sceneMode === 'replay'/)
  assert.match(scene, /const effectiveManifestId = modeNeedsManifest \? \(manifestId \?\? DEMO_FOCUS_MANIFEST_ID\) : manifestId/)
  assert.match(scene, /const showEmptyFocusPanel = !gateBlocksMode && modeNeedsManifest && !activeManifest/)
  assert.match(scene, /'Demo memory star ready'/)
  assert.doesNotMatch(scene, /Memory star unavailable|Memory star not ready|Choose a memory star first/)
})

test('premium overlay uses centralized demo stars and production polish layers', () => {
  assert.match(overlay, /DEMO_MEMORY_STARS/)
  assert.match(overlay, /className="urai-life-map-paths"/)
  assert.match(overlay, /Inner Weather/)
  assert.match(overlay, /Your companion is listening/)
  assert.match(overlay, /Constellation awake/)
  assert.match(overlay, /Choose a star to open Focus/)
  assert.match(overlay, /urai-home-atmosphere/)
  assert.match(overlay, /urai-home-horizon-glow/)
  assert.match(overlay, /urai-home-ground-reflection/)
  assert.match(overlay, /@keyframes uraiOrbBreath/)
  assert.match(overlay, /aria-label="Spatial orientation: north"/)
  assert.match(overlay, /detail="Begin the ascent when you are ready"/)
  assert.doesNotMatch(overlay, /const lifeMapStars|Home Scene|Map online|Visible stars now open Focus/)
})

test('HomeScene does not trigger microphone permission or audio capture on load', () => {
  assert.doesNotMatch(files.sceneRaw, /getUserMedia/i)
  assert.doesNotMatch(files.sceneRaw, /mediaDevices/i)
  assert.doesNotMatch(files.sceneRaw, /AudioContext/i)
})

test('Home scene has visible fallback backgrounds to avoid black screens', () => {
  assert.match(files.css, /\.urai-scene-stage__fallback/)
  assert.match(files.css, /\.urai-scene-stage\[data-scene-mode='ascent'\] \.urai-scene-stage__fallback/)
  assert.match(scene, /<div className="urai-scene-stage__fallback" aria-hidden="true" \/>/)
})

test('Firestore, constellation listener, and manifest renderer remain production safe', () => {
  assert.match(rules, /match \/assetManifests\/\{manifestId\}/)
  assert.match(rules, /allow get, list: if isAdmin\(\) \|\| isManifestOwner\(\) \|\| isLaunchDemoOwner\(resource\.data\.ownerId\);/)
  assert.match(rules, /allow create: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(rules, /allow update: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(rules, /allow delete: if isAdmin\(\);/)

  assert.match(manifests, /where\('ownerId', '==', ownerId\)/)
  assert.match(manifests, /orderBy\('createdAt', 'desc'\)/)
  assert.match(manifests, /NEXT_PUBLIC_URAI_MANIFEST_OWNER_ID/)
  assert.match(manifests, /LAUNCH_DEMO_OWNER_ID = 'launch-demo'/)
  assert.doesNotMatch(manifests, /query\(collection\(getFirebaseDb\(\), 'assetManifests'\), orderBy/)

  assert.ok(renderer.includes('function FallbackPanel'))
  assert.ok(renderer.includes('function isSafeAssetUrl'))
  assert.ok(renderer.includes('No asset attached'))
  assert.ok(renderer.includes('Asset URL unavailable'))
  assert.ok(renderer.includes('Unsupported asset type'))
})
