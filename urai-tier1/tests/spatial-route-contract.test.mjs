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
const lifeMapRoute = read(['src/app/life-map/page.tsx'])
const focusRoute = read(['src/app/focus/page.tsx'])
const replayRoute = read(['src/app/replay/page.tsx'])
const mirrorRoute = read(['src/app/mirror/page.tsx'])
const tierOneExperience = read(['src/spatial/layout/TierOneExperience.tsx'])
const homeScene = read(['src/scene/HomeScene.tsx'])

test('primary routes use the canonical TierOneExperience shell', () => {
  assert.match(compact(homePage), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(homeRoute), /<TierOneExperiencemode="home"\/>/)
  assert.match(compact(lifeMapRoute), /<TierOneExperiencemode="life-map"\/>/)
  assert.match(compact(focusRoute), /<TierOneExperiencemode="focus"\/>/)
  assert.match(compact(replayRoute), /<TierOneExperiencemode="replay"\/>/)
  assert.match(compact(mirrorRoute), /<TierOneExperiencemode="mirror"\/>/)
})

test('TierOneExperience maps routed modes to the spatial shell', () => {
  const source = flat(tierOneExperience)
  assert.match(source, /export type TierOneExperienceMode = "home" \| "life-map" \| "demo" \| "replay" \| "focus" \| "mirror"/)
  assert.match(source, /if \(mode === "replay"\) return "replay" as const/)
  assert.match(source, /if \(mode === "focus" \|\| mode === "mirror"\) return "detail" as const/)
  assert.match(source, /if \(mode === "life-map"\) return "sky" as const/)
  assert.match(source, /<HomeScene sceneMode=\{mode\} \/>/)
})

test('HomeScene keeps Home and Life Map visual authority separate', () => {
  const source = flat(homeScene)
  assert.match(source, /const isHomeMode = sceneMode === 'home'/)
  assert.match(source, /const isConstellationRoute = sceneMode === 'life-map' \|\| sceneMode === 'demo' \|\| params\.get\('mode'\) === 'constellation'/)
  assert.match(source, /const showHomeWorld = isHomeMode/)
  assert.match(source, /const showConstellation = isConstellationRoute/)
  assert.match(source, /const showOrb = isHomeMode \|\| sceneMode === 'focus' \|\| sceneMode === 'replay' \|\| sceneMode === 'mirror'/)
  assert.match(source, /\{showHomeWorld \? <Ground \/> : null\}/)
  assert.match(source, /\{showOrb \? <Orb state=\{orbState\} \/> : null\}/)
  assert.match(source, /\{showConstellation \? <ConstellationLayer enabled selectedManifestId=\{selectedManifest\?\.manifestId \?\? null\} onSelect=\{handleSelect\} \/> : activeManifest \? <ManifestRenderer manifest=\{activeManifest\} \/> : null\}/)
  assert.doesNotMatch(source, /\|\| !manifestId/)
})

test('HomeScene locks route and interaction behavior', () => {
  const source = flat(homeScene)
  assert.match(source, /if \(sceneMode === 'home'\) router\.push\('\/life-map'\)/)
  assert.match(source, /data-testid="urai-sky-click-target"/)
  assert.match(source, /aria-label="Enter Life Map from sky"/)
  assert.match(source, /data-testid="urai-lifemap-guidance"/)
  assert.match(source, /Click a star to open memory focus/)
  assert.match(source, /router\.push\(manifestReplayHref\(id\)\)/)
  assert.match(source, /if \(event\.key === 'Escape'\) unwind\(\)/)
  assert.match(source, /if \(sceneMode === 'replay'\)/)
  assert.match(source, /router\.push\(manifestFocusHref\(manifestId\)\)/)
  assert.match(source, /if \(sceneMode === 'focus'\)/)
  assert.match(source, /router\.push\('\/life-map'\)/)
  assert.match(source, /if \(sceneMode === 'life-map'\)/)
  assert.match(source, /router\.push\('\/home'\)/)
})

test('HomeScene does not trigger microphone permission or audio capture on load', () => {
  const source = homeScene
  assert.doesNotMatch(source, /getUserMedia/i)
  assert.doesNotMatch(source, /mediaDevices/i)
  assert.doesNotMatch(source, /AudioContext/i)
})
