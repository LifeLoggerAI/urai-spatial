import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(candidates) {
  for (const file of candidates) {
    const absolute = path.join(root, file)
    if (fs.existsSync(absolute)) return fs.readFileSync(absolute, 'utf8')
  }
  assert.fail(`missing expected file: ${candidates.join(', ')}`)
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
  scene: read(['src/scene/HomeScene.tsx']),
  overlay: read(['src/scene/SpatialVisualOverlayPremium.tsx']),
  css: read(['src/app/globals.css']),
  rules: read(['../firebase/firestore.rules', 'firebase/firestore.rules']),
  renderer: read(['src/spatial/assets/ManifestRenderer.tsx']),
  manifests: read(['src/spatial/constellation/useConstellationManifests.ts']),
}

const scene = flat(files.scene)

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
  const source = flat(files.tierOne)
  assert.match(source, /export type TierOneExperienceMode = "home" \| "ascent" \| "life-map" \| "demo" \| "replay" \| "focus" \| "mirror"/)
  assert.match(source, /if \(mode === "replay"\) return "replay" as const/)
  assert.match(source, /if \(mode === "focus" \|\| mode === "mirror"\) return "detail" as const/)
  assert.match(source, /if \(mode === "ascent" \|\| mode === "life-map"\) return "sky" as const/)
  assert.match(source, /<HomeScene sceneMode=\{mode\} \/>/)
})

test('HomeScene preserves silent home and spatial route authority', () => {
  assert.match(scene, /import SpatialVisualOverlay from '\.\/SpatialVisualOverlayPremium'/)
  assert.match(scene, /type SceneMode = 'home' \| 'ascent' \| 'life-map' \| 'demo' \| 'replay' \| 'focus' \| 'mirror'/)
  assert.match(scene, /const ASCENT_DURATION_MS = 1800/)
  assert.match(scene, /const isHomeMode = sceneMode === 'home'/)
  assert.match(scene, /const isAscentMode = sceneMode === 'ascent'/)
  assert.match(scene, /const isConstellationRoute = sceneMode === 'life-map' \|\| sceneMode === 'demo' \|\| params\.get\('mode'\) === 'constellation'/)
  assert.match(scene, /const showHomeWorld = isHomeMode/)
  assert.match(scene, /const showAscentPortal = isAscentMode/)
  assert.match(scene, /const showConstellation = isConstellationRoute/)
  assert.match(scene, /const showOrb = sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror'/)
  assert.match(scene, /if \(mode === 'home'\) return null/)
  assert.match(scene, /onClick=\{isHomeMode \? enterLifeMap : undefined\}/)
  assert.doesNotMatch(scene, /data-testid="urai-sky-click-target"/)
  assert.doesNotMatch(scene, /data-testid="urai-sky-guidance"/)
  assert.doesNotMatch(scene, /const showOrb = isHomeMode/)
})

test('HomeScene routes Home to Ascent to Life Map and supports focus replay unwind', () => {
  assert.match(scene, /if \(sceneMode === 'home'\) router\.push\('\/ascent'\)/)
  assert.match(scene, /if \(sceneMode === 'ascent'\) router\.push\('\/life-map'\)/)
  assert.match(scene, /data-testid="urai-ascent-guidance"/)
  assert.match(scene, /Ascending into your Life Map/)
  assert.match(scene, /window\.setTimeout\(\(\) => router\.push\('\/life-map'\), ASCENT_DURATION_MS\)/)
  assert.match(scene, /router\.push\(`\/focus\?manifestId=\$\{encodeURIComponent\(manifest\.manifestId\)\}`\)/)
  assert.match(scene, /router\.push\(manifestReplayHref\(activeManifestId\)\)/)
  assert.match(scene, /if \(event\.key === 'Escape'\) unwind\(\)/)
  assert.match(scene, /if \(event\.key\.toLowerCase\(\) === 'r' && !isHomeMode\) resetCamera\(\)/)
  assert.match(scene, /if \(sceneMode === 'replay'\)/)
  assert.match(scene, /router\.push\(manifestFocusHref\(activeManifestId\)\)/)
  assert.match(scene, /if \(sceneMode === 'focus'\)/)
  assert.match(scene, /router\.push\('\/life-map'\)/)
  assert.match(scene, /if \(sceneMode === 'life-map' \|\| sceneMode === 'ascent'\)/)
  assert.match(scene, /router\.push\('\/'\)/)
  assert.doesNotMatch(scene, /router\.push\('\/home'\)/)
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
  const source = flat(files.overlay)
  assert.match(source, /DEMO_MEMORY_STARS/)
  assert.match(source, /className="urai-life-map-paths"/)
  assert.match(source, /Inner Weather/)
  assert.match(source, /Your companion is listening/)
  assert.match(source, /Constellation awake/)
  assert.match(source, /Choose a star to open Focus/)
  assert.match(source, /urai-home-atmosphere/)
  assert.match(source, /urai-home-horizon-glow/)
  assert.match(source, /urai-home-ground-reflection/)
  assert.match(source, /@keyframes uraiOrbBreath/)
  assert.match(source, /aria-label="Spatial orientation: north"/)
  assert.match(source, /detail="Begin the ascent when you are ready"/)
  assert.doesNotMatch(source, /const lifeMapStars|Home Scene|Map online|Visible stars now open Focus/)
})

test('HomeScene does not trigger microphone permission or audio capture on load', () => {
  assert.doesNotMatch(files.scene, /getUserMedia/i)
  assert.doesNotMatch(files.scene, /mediaDevices/i)
  assert.doesNotMatch(files.scene, /AudioContext/i)
})

test('Home scene has visible fallback backgrounds to avoid black screens', () => {
  assert.match(files.css, /\.urai-scene-stage__fallback/)
  assert.match(files.css, /\.urai-scene-stage\[data-scene-mode='ascent'\] \.urai-scene-stage__fallback/)
  assert.match(scene, /<div className="urai-scene-stage__fallback" aria-hidden="true" \/>/)
})

test('Firestore, constellation listener, and manifest renderer remain production safe', () => {
  const rules = flat(files.rules)
  assert.match(rules, /match \/assetManifests\/\{manifestId\}/)
  assert.match(rules, /allow get, list: if isAdmin\(\) \|\| isManifestOwner\(\) \|\| isLaunchDemoOwner\(resource\.data\.ownerId\);/)
  assert.match(rules, /allow create: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(rules, /allow update: if isAdmin\(\) && isValidSpatialManifestCreate\(\);/)
  assert.match(rules, /allow delete: if isAdmin\(\);/)

  const manifests = flat(files.manifests)
  assert.match(manifests, /where\('ownerId', '==', ownerId\)/)
  assert.match(manifests, /orderBy\('createdAt', 'desc'\)/)
  assert.match(manifests, /NEXT_PUBLIC_URAI_MANIFEST_OWNER_ID/)
  assert.match(manifests, /LAUNCH_DEMO_OWNER_ID = 'launch-demo'/)
  assert.doesNotMatch(manifests, /query\(collection\(getFirebaseDb\(\), 'assetManifests'\), orderBy/)

  const renderer = flat(files.renderer)
  assert.ok(renderer.includes('function FallbackPanel'))
  assert.ok(renderer.includes('function isSafeAssetUrl'))
  assert.ok(renderer.includes('No asset attached'))
  assert.ok(renderer.includes('Asset URL unavailable'))
  assert.ok(renderer.includes('Unsupported asset type'))
})
