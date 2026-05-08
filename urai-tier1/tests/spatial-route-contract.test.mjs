import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function firstExisting(relativeCandidates) {
  const found = relativeCandidates
    .map((relativePath) => path.join(root, relativePath))
    .find((absolutePath) => fs.existsSync(absolutePath))

  assert.ok(found, `Expected one of these files to exist: ${relativeCandidates.join(', ')}`)
  return found
}

function read(relativeCandidates) {
  return fs.readFileSync(firstExisting(relativeCandidates), 'utf8')
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
const homeScene = read(['src/scene/HomeScene.tsx'])
const premiumOverlay = read(['src/scene/SpatialVisualOverlayPremium.tsx'])
const globalsCss = read(['src/app/globals.css'])
const firestoreRules = read(['../firebase/firestore.rules', 'firebase/firestore.rules'])
const manifestRenderer = read(['src/spatial/assets/ManifestRenderer.tsx'])
const constellationManifests = read(['src/spatial/constellation/useConstellationManifests.ts'])
const constellationLayer = read(['src/spatial/constellation/ConstellationLayer.tsx'])

test('primary routes use the canonical TierOneExperience shell', () => {
  assert.match(compact(homePage), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(homeRoute), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(ascentRoute), /<TierOneExperiencemode="ascent"\/>/)
  assert.match(compact(lifeMapRoute), /<TierOneExperiencemode="life-map"\/>/)
  assert.match(compact(focusRoute), /<TierOneExperiencemode="focus"\/>/)
  assert.match(compact(replayRoute), /<TierOneExperiencemode="replay"\/>/)
  assert.match(compact(mirrorRoute), /<TierOneExperiencemode="mirror"\/>/)
})

test('TierOneExperience maps routed modes to the spatial shell', () => {
  const source = flat(tierOneExperience)
  assert.match(source, /export type TierOneExperienceMode = "home" \| "ascent" \| "life-map" \| "demo" \| "replay" \| "focus" \| "mirror"/)
  assert.match(source, /if \(mode === "replay"\) return "replay" as const/)
  assert.match(source, /if \(mode === "focus" \|\| mode === "mirror"\) return "detail" as const/)
  assert.match(source, /if \(mode === "ascent" \|\| mode === "life-map"\) return "sky" as const/)
  assert.match(source, /<HomeScene sceneMode=\{mode\} \/>/)
})

test('HomeScene keeps Home, Ascent, and Life Map visual authority separate', () => {
  const source = flat(homeScene)
  assert.match(source, /import SpatialVisualOverlay from '\.\/SpatialVisualOverlay(?:Premium|Tier5)'/)
  assert.match(source, /type SceneMode = 'home' \| 'ascent' \| 'life-map' \| 'demo' \| 'replay' \| 'focus' \| 'mirror'/)
  assert.match(source, /const ASCENT_DURATION_MS = 1800/)
  assert.match(source, /const isHomeMode = sceneMode === 'home'/)
  assert.match(source, /const isAscentMode = sceneMode === 'ascent'/)
  assert.match(source, /const isConstellationRoute = sceneMode === 'life-map' \|\| sceneMode === 'demo' \|\| params\.get\('mode'\) === 'constellation'/)
  assert.match(source, /const showHomeWorld = isHomeMode/)
  assert.match(source, /const showAscentPortal = isAscentMode/)
  assert.match(source, /const showConstellation = isConstellationRoute/)
  assert.match(source, /const showOrb = isHomeMode \|\| sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror'/)
  assert.ok(source.includes('{showHomeWorld ? <Ground /> : null}'))
  assert.ok(source.includes('{showAscentPortal ? <AscentPortal /> : null}'))
  assert.ok(source.includes('{showOrb ? <Orb state={orbState} /> : null}'))
  assert.ok(source.includes('ConstellationLayer enabled'))
  assert.ok(source.includes('ManifestRenderBoundary manifest={activeManifest}'))
  assert.doesNotMatch(source, /\|\| !manifestId/)
})

test('HomeScene locks home to ascent to lifemap routing', () => {
  const source = flat(homeScene)
  assert.match(source, /if \(sceneMode === 'home'\) router\.push\('\/ascent'\)/)
  assert.match(source, /if \(sceneMode === 'ascent'\) router\.push\('\/life-map'\)/)
  assert.match(source, /data-testid="urai-sky-click-target"/)
  assert.match(source, /aria-label="Begin ascent to Life Map"/)
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
  assert.match(source, /if \(sceneMode === 'replay'\)/)
  assert.match(source, /router\.push\(manifestFocusHref\(activeManifestId\)\)/)
  assert.match(source, /if \(sceneMode === 'focus'\)/)
  assert.match(source, /router\.push\('\/life-map'\)/)
  assert.match(source, /if \(sceneMode === 'life-map' \|\| sceneMode === 'ascent'\)/)
  assert.match(source, /router\.push\('\/'\)/)
  assert.doesNotMatch(source, /router\.push\('\/home'\)/)
})

test('canonical Life Map has a 3D cosmic constellation and travel controls', () => {
  const scene = flat(homeScene)
  const constellation = flat(constellationLayer)
  assert.match(scene, /import \{ OrbitControls, PerspectiveCamera \} from '@react-three\/drei'/)
  assert.match(scene, /<OrbitControls makeDefault enablePan enableZoom enableRotate/)
  assert.match(scene, /active=\{!showConstellation\}/)
  assert.match(scene, /reducedMotion=\{reducedMotion\}/)
  assert.match(constellation, /function LifeMapStarfield3D/)
  assert.match(constellation, /function NebulaField/)
  assert.match(constellation, /function ConstellationArcs/)
  assert.match(constellation, /data-testid="lifemap-starfield-3d"/)
  assert.match(constellation, /data-testid="lifemap-cosmic-constellation"/)
  assert.match(constellation, /data-testid="lifemap-constellation-arcs"/)
  assert.match(constellation, /fallbackLabels = \['Memory Bloom', 'Threshold', 'Mirror Focus', 'Ritual Echo', 'Dream Signal', 'Calm Return', 'Recovery Arc'\]/)
})

test('Life Map starfield is deterministic and reduced-motion safe', () => {
  const source = flat(constellationLayer)
  assert.match(source, /const STARFIELD_SEED = 1947/)
  assert.match(source, /function seededValue/)
  assert.match(source, /speed=\{reducedMotion \? 0 : 0\.38\}/)
  assert.match(source, /speed=\{reducedMotion \? 0 : 0\.18\}/)
  assert.match(source, /if \(!fieldRef\.current \|\| reducedMotion\) return/)
  assert.match(source, /if \(!ref\.current \|\| reducedMotion\) return/)
})

test('focus and replay use demo fallback instead of unavailable error copy', () => {
  const source = flat(homeScene)
  assert.match(source, /function FocusEmptyPanel/)
  assert.match(source, /data-testid="urai-focus-empty-panel"/)
  assert.match(source, /const modeNeedsManifest = sceneMode === 'focus' \|\| sceneMode === 'replay'/)
  assert.match(source, /const effectiveManifestId = modeNeedsManifest \? \(manifestId \?\? DEMO_FOCUS_MANIFEST_ID\) : manifestId/)
  assert.match(source, /const showEmptyFocusPanel = !gateBlocksMode && modeNeedsManifest && !activeManifest/)
  assert.match(source, /loading \? 'Opening memory star\.\.\.'/)
  assert.match(source, /'Demo memory star ready'/)
  assert.doesNotMatch(source, /Memory star unavailable/)
  assert.doesNotMatch(source, /Memory star not ready/)
  assert.doesNotMatch(source, /Choose a memory star first/)
})

test('premium overlay uses centralized demo stars, product copy, and SVG constellation paths', () => {
  const source = flat(premiumOverlay)
  assert.match(source, /DEMO_MEMORY_STARS/)
  assert.match(source, /className="urai-life-map-paths"/)
  assert.match(source, /<path d="M18 33 C26 24 35 28 45 36 S56 48 61 52"/)
  assert.match(source, /Inner Weather/)
  assert.match(source, /Your companion is listening/)
  assert.match(source, /Constellation awake/)
  assert.match(source, /Choose a star to open Focus/)
  assert.doesNotMatch(source, /const lifeMapStars/)
  assert.doesNotMatch(source, /Home Scene/)
  assert.doesNotMatch(source, /Sky, ground, and companion orb loaded/)
  assert.doesNotMatch(source, /Map online/)
  assert.doesNotMatch(source, /Visible stars now open Focus/)
})

test('premium home overlay locks production polish layers and launch CTA clarity', () => {
  const source = flat(premiumOverlay)
  assert.match(source, /urai-home-atmosphere/)
  assert.match(source, /urai-home-horizon-glow/)
  assert.match(source, /urai-home-ground-reflection/)
  assert.match(source, /urai-home-orb__aura-outer/)
  assert.match(source, /@keyframes uraiOrbBreath/)
  assert.match(source, /@keyframes uraiAuraDrift/)
  assert.match(source, /aria-label="Spatial orientation: north"/)
  assert.match(source, /detail="Begin the ascent when you are ready"/)
})

test('HomeScene does not trigger microphone permission or audio capture on load', () => {
  const source = homeScene
  assert.doesNotMatch(source, /getUserMedia/i)
  assert.doesNotMatch(source, /mediaDevices/i)
  assert.doesNotMatch(source, /AudioContext/i)
})

test('Home scene has visible fallback backgrounds to avoid black screens', () => {
  assert.match(globalsCss, /\.urai-scene-stage__fallback/)
  assert.match(globalsCss, /\.urai-scene-stage\[data-scene-mode='ascent'\] \.urai-scene-stage__fallback/)
  assert.match(flat(homeScene), /<div className="urai-scene-stage__fallback" aria-hidden="true" \/>/)
})

test('assetManifests are readable by owner admin or launch-demo and writes stay admin-only', () => {
  const source = flat(firestoreRules)
  assert.match(source, /match \/assetManifests\/\{manifestId\}/)
  assert.match(source, /allow get, list: if isAdmin\(\) \|\| isManifestOwner\(\) \|\| isLaunchDemoOwner\(resource\.data\.ownerId\);/)
  assert.match(source, /allow create: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(source, /allow update: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(source, /allow delete: if isAdmin\(\);/)
})

test('constellation Firestore listener uses scoped owner queries that match rules', () => {
  const source = flat(constellationManifests)
  assert.match(source, /where\('ownerId', '==', ownerId\)/)
  assert.match(source, /orderBy\('createdAt', 'desc'\)/)
  assert.match(source, /NEXT_PUBLIC_URAI_MANIFEST_OWNER_ID/)
  assert.match(source, /LAUNCH_DEMO_OWNER_ID = 'launch-demo'/)
  assert.doesNotMatch(source, /query\(collection\(getFirebaseDb\(\), 'assetManifests'\), orderBy/)
})

test('manifest renderer has safe fallbacks for unavailable assets', () => {
  const source = flat(manifestRenderer)
  assert.ok(source.includes('function FallbackPanel'))
  assert.ok(source.includes('function isSafeAssetUrl'))
  assert.ok(source.includes('No asset attached'))
  assert.ok(source.includes('Asset URL unavailable'))
  assert.ok(source.includes('Unsupported asset type'))
  assert.ok(source.includes('Image unavailable'))
  assert.ok(source.includes('Video unavailable'))
  assert.ok(source.includes('3D model unavailable'))
})
