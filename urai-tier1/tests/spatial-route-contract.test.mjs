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
  assert.fail(`Expected one of these files to exist: ${relativeCandidates.join(', ')}`)
}

function compact(code) {
  return code.replace(/\s+/g, '')
}

function flat(code) {
  return code.replace(/\s+/g, ' ')
}

const homePage = read(['src/app/page.tsx'])
const homeRoute = read(['src/app/home/page.tsx'])
const ascentRoute = read(['src/app/ascent/page.tsx'])
const lifeMapRoute = read(['src/app/life-map/page.tsx'])
const focusRoute = read(['src/app/focus/page.tsx'])
const replayRoute = read(['src/app/replay/page.tsx'])
const mirrorRoute = read(['src/app/mirror/page.tsx'])
const tierOneExperience = read(['src/spatial/layout/TierOneExperience.tsx'])
const homeSceneRaw = read(['src/scene/HomeScene.tsx'])
const homeScene = flat(homeSceneRaw)
const premiumOverlay = flat(
  read([
    'src/scene/SpatialVisualOverlayTier5.tsx',
    'src/scene/SpatialVisualOverlayPremium.tsx',
  ]),
)
const globalsCss = read(['src/app/globals.css'])
const firestoreRules = flat(read(['../firebase/firestore.rules', 'firebase/firestore.rules']))
const manifestRenderer = flat(read(['src/spatial/assets/ManifestRenderer.tsx']))
const constellationManifests = flat(read(['src/spatial/constellation/useConstellationManifests.ts']))

test('primary routes use the canonical TierOneExperience shell', () => {
  assert.match(compact(homePage), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(homeRoute), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(ascentRoute), /<TierOneExperiencemode="ascent"\/>/)
  assert.match(compact(lifeMapRoute), /<TierOneExperiencemode="life-map"\/>/)
  assert.match(compact(focusRoute), /<TierOneExperiencemode="focus"\/>/)
  assert.match(compact(replayRoute), /<TierOneExperiencemode="replay"\/>/)
  assert.match(compact(mirrorRoute), /<TierOneExperiencemode="mirror"\/>/)
})

test('TierOneExperience maps routed modes to the canonical HomeScene shell', () => {
  const source = flat(tierOneExperience)
  assert.match(source, /export type TierOneExperienceMode = "home" \| "ascent" \| "life-map" \| "demo" \| "replay" \| "focus" \| "mirror"/)
  assert.match(source, /if \(mode === "replay"\) return "replay" as const/)
  assert.match(source, /if \(mode === "focus" \|\| mode === "mirror"\) return "detail" as const/)
  assert.match(source, /if \(mode === "ascent" \|\| mode === "life-map"\) return "sky" as const/)
  assert.match(source, /<HomeScene sceneMode=\{mode\} \/>/)
})

test('HomeScene keeps Home, Ascent, and Life Map visual authority separate', () => {
  const source = flat(homeScene)
  assert.match(source, /import SpatialVisualOverlay from '\.\/SpatialVisualOverlayTier5'/)
  assert.match(source, /type SceneMode = 'home' \| 'ascent' \| 'life-map' \| 'demo' \| 'replay' \| 'focus' \| 'mirror'/)
  assert.match(source, /const ASCENT_DURATION_MS = 1800/)
  assert.match(source, /const isHomeMode = sceneMode === 'home'/)
  assert.match(source, /const isAscentMode = sceneMode === 'ascent'/)
  assert.match(source, /const isConstellationRoute = sceneMode === 'life-map' \|\| sceneMode === 'demo' \|\| params\.get\('mode'\) === 'constellation'/)
  assert.match(source, /const showHomeWorld = isHomeMode/)
  assert.match(source, /const showAscentPortal = isAscentMode/)
  assert.match(source, /const showConstellation = isConstellationRoute/)
  assert.match(source, /const showOrb = sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror'/)
  assert.ok(source.includes('{showHomeWorld ? <Ground /> : null}'))
  assert.ok(source.includes('{showAscentPortal ? <AscentPortal /> : null}'))
  assert.ok(source.includes('{showOrb ? <Orb state={orbState} /> : null}'))
  assert.ok(source.includes('ConstellationLayer enabled'))
  assert.ok(source.includes('ManifestRenderBoundary manifest={activeManifest}'))
  assert.doesNotMatch(source, /\|\| !manifestId/)
})

test('HomeScene locks silent home to intentional ascent to lifemap routing', () => {
  const source = flat(homeScene)
  assert.match(source, /if \(sceneMode === 'home'\) router\.push\('\/ascent'\)/)
  assert.match(source, /if \(sceneMode === 'ascent'\) router\.push\('\/life-map'\)/)
  assert.match(source, /data-testid="urai-scene-stage"/)
  assert.match(source, /function HomeActivationButton/)
  assert.match(source, /data-testid="urai-home-activation"/)
  assert.match(source, /aria-label="Open the URAI Life Map"/)
  assert.match(source, /<HomeActivationButton onEnter=\{enterLifeMap\} \/>/)
  assert.doesNotMatch(source, /onClick=\{isHomeMode \? enterLifeMap : undefined\}/)
  assert.match(source, /onPointerMissed=\{!isHomeMode \? enterLifeMap : undefined\}/)
  assert.match(source, /if \(mode === 'home'\) return null/)
  assert.doesNotMatch(source, /data-testid="urai-sky-click-target"/)
  assert.doesNotMatch(source, /aria-label="Begin ascent to Life Map"/)
  assert.doesNotMatch(source, /data-testid="urai-sky-guidance"/)
  assert.match(source, /data-testid="urai-ascent-guidance"/)
  assert.match(source, /Ascending into your Life Map/)
  assert.match(source, /if \(!isAscentMode \|\| reducedMotion\) return/)
  assert.match(source, /window\.setTimeout\(\(\) => router\.push\('\/life-map'\), ASCENT_DURATION_MS\)/)
})

test('Life Map star selection routes to focus with manifestId', () => {
  const source = flat(homeScene)
  assert.match(source, /router\.push\(`\/focus\?manifestId=\$\{encodeURIComponent\(manifest\.manifestId\)\}`\)/)
})

test('HomeScene locks focus, replay, mirror, and unwind behavior', () => {
  const source = flat(homeScene)
  assert.match(source, /data-testid="urai-lifemap-guidance"/)
  assert.match(source, /Click a star to open memory focus/)
  assert.match(source, /router\.push\(manifestReplayHref\(activeManifestId\)\)/)
  assert.match(source, /if \(event\.key === 'Escape'\) unwind\(\)/)
  assert.match(source, /if \(event\.key\.toLowerCase\(\) === 'r' && !isHomeMode\) resetCamera\(\)/)
  assert.match(source, /if \(sceneMode === 'replay'\)/)
  assert.match(source, /router\.push\(manifestFocusHref\(activeManifestId\)\)/)
  assert.match(source, /if \(sceneMode === 'focus'\)/)
  assert.match(source, /router\.push\('\/life-map'\)/)
  assert.match(source, /if \(sceneMode === 'life-map' \|\| sceneMode === 'ascent'\)/)
  assert.match(source, /router\.push\('\/'\)/)
  assert.doesNotMatch(source, /router\.push\('\/home'\)/)
})

test('focus and replay use demo fallback instead of unavailable error copy', () => {
  assert.match(homeScene, /function FocusEmptyPanel/)
  assert.match(homeScene, /data-testid="urai-focus-empty-panel"/)
  assert.match(homeScene, /const modeNeedsManifest = sceneMode === 'focus' \|\| sceneMode === 'replay'/)
  assert.match(homeScene, /const effectiveManifestId = modeNeedsManifest \? \(manifestId \?\? DEMO_FOCUS_MANIFEST_ID\) : manifestId/)
  assert.match(homeScene, /const showEmptyFocusPanel = !gateBlocksMode && modeNeedsManifest && !activeManifest/)
  assert.match(homeScene, /'Demo memory star ready'/)
  assert.doesNotMatch(homeScene, /Memory star unavailable|Memory star not ready|Choose a memory star first/)
})

test('premium overlay uses centralized demo stars and production polish layers', () => {
  assert.match(premiumOverlay, /DEMO_MEMORY_STARS/)
  assert.match(premiumOverlay, /className="urai-life-map-paths"/)
  assert.match(premiumOverlay, /Your companion is listening|Companion online/)
  assert.match(premiumOverlay, /Constellation awake/)
  assert.match(premiumOverlay, /Choose a star to open Focus/)
  assert.match(premiumOverlay, /urai-home-atmosphere/)
  assert.match(premiumOverlay, /urai-home-horizon-glow/)
  assert.match(premiumOverlay, /urai-home-ground-reflection/)
  assert.match(premiumOverlay, /@keyframes urai.*OrbBreath/)
  assert.match(premiumOverlay, /aria-label="Spatial orientation: north"/)
  assert.match(premiumOverlay, /detail="Begin the ascent when you are ready"/)
  assert.doesNotMatch(premiumOverlay, /const lifeMapStars|Home Scene|Map online/)
})

test('HomeScene does not trigger microphone permission or audio capture on load', () => {
  assert.doesNotMatch(homeSceneRaw, /getUserMedia/i)
  assert.doesNotMatch(homeSceneRaw, /mediaDevices/i)
  assert.doesNotMatch(homeSceneRaw, /AudioContext/i)
})

test('Home scene has visible fallback backgrounds to avoid black screens', () => {
  assert.match(globalsCss, /\.urai-scene-stage__fallback/)
  assert.match(globalsCss, /\.urai-scene-stage\[data-scene-mode='ascent'\] \.urai-scene-stage__fallback/)
  assert.match(homeScene, /<div className="urai-scene-stage__fallback" aria-hidden="true" \/>/)
})

test('Firestore, constellation listener, and manifest renderer remain production safe', () => {
  assert.match(firestoreRules, /match \/assetManifests\/\{manifestId\}/)
  assert.match(firestoreRules, /allow get, list: if isAdmin\(\) \|\| isManifestOwner\(\) \|\| isLaunchDemoOwner\(resource\.data\.ownerId\);/)
  assert.match(firestoreRules, /allow create: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(firestoreRules, /match \/homeWorld\/\{docId\}/)
  assert.match(firestoreRules, /match \/homeWorldExplainability\/\{docId\}/)
  assert.match(constellationManifests, /where\('ownerId', '==', ownerId\)/)
  assert.match(constellationManifests, /orderBy\('createdAt', 'desc'\)/)
  assert.match(constellationManifests, /LAUNCH_DEMO_OWNER_ID = 'launch-demo'/)
  assert.doesNotMatch(constellationManifests, /query\(collection\(getFirebaseDb\(\), 'assetManifests'\), orderBy/)
  assert.ok(manifestRenderer.includes('function FallbackPanel'))
  assert.ok(manifestRenderer.includes('function isSafeAssetUrl'))
  assert.ok(manifestRenderer.includes('Unsupported asset type'))
})
