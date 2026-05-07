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
  assert.match(source, /type SceneMode = 'home' \| 'ascent' \| 'life-map' \| 'demo' \| 'replay' \| 'focus' \| 'mirror'/)
  assert.match(source, /const ASCENT_DURATION_MS = 1800/)
  assert.match(source, /const isHomeMode = sceneMode === 'home'/)
  assert.match(source, /const isAscentMode = sceneMode === 'ascent'/)
  assert.match(source, /const isConstellationRoute = sceneMode === 'life-map' \|\| sceneMode === 'demo' \|\| params\.get\('mode'\) === 'constellation'/)
  assert.match(source, /const showHomeWorld = isHomeMode \|\| isAscentMode/)
  assert.match(source, /const showConstellation = isConstellationRoute/)
  assert.match(source, /const showOrb = isHomeMode \|\| isAscentMode \|\| sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror'/)
  assert.match(source, /\{showHomeWorld \? <Ground \/> : null\}/)
  assert.match(source, /\{showOrb \? <Orb state=\{orbState\} \/> : null\}/)
  assert.match(source, /\{showConstellation \? <ConstellationLayer enabled selectedManifestId=\{selectedManifest\?\.manifestId \?\? null\} onSelect=\{handleSelect\} \/> : activeManifest \? <ManifestRenderer manifest=\{activeManifest\} \/> : null\}/)
  assert.doesNotMatch(source, /\|\| !manifestId/)
})

test('HomeScene locks home to ascent to lifemap routing', () => {
  const source = flat(homeScene)
  assert.match(source, /if \(sceneMode === 'home'\) router\.push\('\/ascent'\)/)
  assert.match(source, /data-testid="urai-sky-click-target"/)
  assert.match(source, /aria-label="Begin ascent to Life Map"/)
  assert.match(source, /data-testid="urai-ascent-guidance"/)
  assert.match(source, /Ascending into your Life Map/)
  assert.match(source, /window\.setTimeout\(\(\) => \{ router\.push\('\/life-map'\) \}, ASCENT_DURATION_MS\)/)
})

test('HomeScene locks focus, replay, mirror, and unwind behavior', () => {
  const source = flat(homeScene)
  assert.match(source, /data-testid="urai-lifemap-guidance"/)
  assert.match(source, /Click a star to open memory focus/)
  assert.match(source, /router\.push\(manifestReplayHref\(id\)\)/)
  assert.match(source, /if \(event\.key === 'Escape'\) unwind\(\)/)
  assert.match(source, /if \(sceneMode === 'replay'\)/)
  assert.match(source, /router\.push\(manifestFocusHref\(manifestId\)\)/)
  assert.match(source, /if \(sceneMode === 'focus'\)/)
  assert.match(source, /router\.push\('\/life-map'\)/)
  assert.match(source, /if \(sceneMode === 'life-map' \|\| sceneMode === 'ascent'\)/)
  assert.match(source, /router\.push\('\/home'\)/)
})

test('HomeScene does not trigger microphone permission or audio capture on load', () => {
  const source = homeScene
  assert.doesNotMatch(source, /getUserMedia/i)
  assert.doesNotMatch(source, /mediaDevices/i)
  assert.doesNotMatch(source, /AudioContext/i)
})
