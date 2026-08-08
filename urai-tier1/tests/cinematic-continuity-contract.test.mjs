import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()
const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
const lifeMap = read('src/components/lifemap/ComposedLifeMapScene.tsx')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const replay = read('src/app/replay/CinematicReplayClient.tsx')
const lifemapNavigation = read('src/spatial/interaction/LifeMapNavigationOverlay.tsx')

test('cinematic continuity is carried by canonical route owners, not a global TierOne overlay', () => {
  assert.match(homeRuntime, /data-home-visual-owner="asset-driven-personalized-sanctuary"/)
  assert.match(lifeMap, /data-testid="urai-true-3d-life-map"/)
  assert.match(focus, /requestUraiWorldReturn/)
  assert.match(replay, /requestUraiWorldReturn/)
  assert.equal(fs.existsSync(path.join(root, 'src/spatial/layout/SpatialCinematicContinuityLayer.tsx')), false)
  assert.equal(fs.existsSync(path.join(root, 'src/spatial/layout/TierOneExperience.tsx')), false)
})

test('Home and Life Map preserve atmospheric and reduced-motion continuity', () => {
  assert.match(homeRuntime, /home-world-context/)
  assert.match(homeRuntime, /prefers-reduced-motion:reduce/)
  assert.match(lifeMap, /life-map__threshold-bloom/)
  assert.match(lifeMap, /profile\.reducedMotion/)
  assert.match(lifeMap, /aria-label="URAI Life Map"/)
})

test('Life Map navigation speaks in symbolic layer language instead of mechanical UI language only', () => {
  assert.match(lifemapNavigation, /Why am I seeing this\?/)
  assert.match(lifemapNavigation, /emotional nebulae/)
  assert.match(lifemapNavigation, /recovery paths/)
  assert.match(lifemapNavigation, /ritual and threshold markers/)
  assert.match(lifemapNavigation, /relationship clusters/)
  assert.match(lifemapNavigation, /Council guide lights/)
  assert.match(lifemapNavigation, /aria-label="Life Map time lens and memory explanation"/)
})
